const { Player } = require("./models");
const {
	normalizeStatus: normalizeStatusEnum,
	PlayerStatus,
} = require("./status-enums");

class RaidHelperParser {
	constructor() {
		this.WOW_CLASSES = new Set([
			"Warrior",
			"Paladin",
			"Hunter",
			"Rogue",
			"Priest",
			"Shaman",
			"Mage",
			"Warlock",
			"Druid",
			"Tank", // Special Raid Helper class
		]);

		// Raid-Helper encodes attendance as fake "classes"
		this.STATUS_CLASSES = new Set([
			"Absence",
			"Bench",
			"Late",
			"Tentative",
		]);
	}

	/* ────────────────────────────────────────────── */
	/* VALIDATION                                     */
	/* ────────────────────────────────────────────── */

	validate(data) {
		const errors = [];

		if (!data) {
			errors.push("No data provided");
			return { valid: false, errors };
		}

		if (data.reason) {
			errors.push(`Raid Helper error: ${data.reason}`);
			return { valid: false, errors };
		}

		// Supports BOTH API (signUps) and JSON import (raidDrop)
		if (!Array.isArray(data.raidDrop) && !Array.isArray(data.signUps)) {
			errors.push("Missing raidDrop or signUps array");
			return { valid: false, errors };
		}

		return { valid: true, errors: [] };
	}

	/* ────────────────────────────────────────────── */
	/* STATUS DETERMINATION                           */
	/* ────────────────────────────────────────────── */

	/**
	 * Determine the player's status based on className field
	 * LOGIC:
	 * - If className is a WoW class → status is "confirmed" (they're signed up)
	 * - If className is a status indicator → that's their status
	 */
	determineStatus(entry) {
		const className = entry.className || entry.class;

		if (!className) {
			return PlayerStatus.CONFIRMED; // Default to confirmed if no className
		}

		// Check if className is actually a status indicator
		if (this.STATUS_CLASSES.has(className)) {
			// Map the status class to our normalized status
			const statusMap = {
				Absence: "absence",
				Bench: "benched",
				Late: "late",
				Tentative: "tentative",
			};

			return normalizeStatusEnum(
				statusMap[className],
				PlayerStatus.CONFIRMED
			);
		}

		// Check if className is a valid WoW class
		if (this.WOW_CLASSES.has(className)) {
			// It's a real class, so player is confirmed/signed up
			return PlayerStatus.CONFIRMED;
		}

		// Unknown className - default to confirmed
		return PlayerStatus.CONFIRMED;
	}

	/**
	 * Determine the player's actual WoW class
	 * LOGIC:
	 * - If className is a WoW class → use it
	 * - If className is a status → infer from spec
	 */
	determineClass(entry) {
		const className = entry.className || entry.class;

		// First check if className is actually a WoW class
		if (this.WOW_CLASSES.has(className)) {
			return className;
		}

		// If className is a status, try to infer from spec
		const spec = entry.specName || entry.spec || entry.spec1;
		if (spec) {
			const inferredClass = this.inferClassFromSpec(spec);
			if (inferredClass) {
				return inferredClass;
			}
		}

		return null; // Could not determine class
	}

	/* ────────────────────────────────────────────── */
	/* PARSER                                        */
	/* ────────────────────────────────────────────── */

	parse(data) {
		const validation = this.validate(data);
		if (!validation.valid) {
			return { success: false, errors: validation.errors, players: [] };
		}

		const source = Array.isArray(data.signUps)
			? data.signUps
			: data.raidDrop;

		const players = [];
		const warnings = [];
		let emptySlots = 0;

		source.forEach((entry, index) => {
			if (!entry || !entry.name) {
				emptySlots++;
				return;
			}

			// Determine status based on className
			const status = this.determineStatus(entry);

			/* ─────────── CLASS RESOLUTION ─────────── */
			let wowClass = this.determineClass(entry);

			// Handle players without a determinable class
			if (!wowClass) {
				// For Absence/Benched players, this is expected - no warning needed
				if (status === "absence") {
					wowClass = status; // Set className to status
				} else {
					// For active players (confirmed, tentative, late), warn if no class
					warnings.push(
						`Slot ${index + 1} (${
							entry.name
						}): Unable to determine WoW class (className: ${
							entry.className
						}, spec: ${
							entry.specName || "none"
						}) - Status: ${status}`
					);
				}
			}

			/* ─────────── PLAYER CREATION ─────────── */
			players.push(
				new Player({
					userid: entry.userid || entry.userId,
					name: entry.name,
					class: wowClass,
					spec:
						entry.specName ||
						entry.spec ||
						entry.spec1 ||
						"Unknown",
					signuptime: entry.signuptime || entry.entryTime,
					status,
					note: entry.note,
					partyId: entry.partyId,
					slotId: entry.slotId || entry.position,
				})
			);
		});

		return {
			success: true,
			players,
			warnings,
			stats: {
				parsedPlayers: players.length,
				emptySlots,
			},
		};
	}

	/* ────────────────────────────────────────────── */
	/* CLASS INFERENCE                                */
	/* ────────────────────────────────────────────── */

	inferClassFromSpec(spec) {
		if (!spec) return null;

		const specMap = {
			// Warrior
			Arms: "Warrior",
			Fury: "Warrior",
			Protection: "Warrior",

			// Paladin
			Holy: "Paladin",
			Holy1: "Paladin",
			Retribution: "Paladin",
			Protection1: "Paladin",

			// Hunter
			"Beast Mastery": "Hunter",
			Beastmastery: "Hunter",
			Marksmanship: "Hunter",
			Survival: "Hunter",

			// Rogue
			Assassination: "Rogue",
			Combat: "Rogue",
			Subtlety: "Rogue",

			// Priest
			Discipline: "Priest",
			Shadow: "Priest",

			// Shaman
			Elemental: "Shaman",
			Enhancement: "Shaman",
			Restoration: "Shaman",
			Restoration1: "Shaman",

			// Mage
			Arcane: "Mage",
			Fire: "Mage",
			Frost: "Mage",

			// Warlock
			Affliction: "Warlock",
			Demonology: "Warlock",
			Destruction: "Warlock",

			// Druid
			Balance: "Druid",
			Dreamstate: "Druid",
			Feral: "Druid",
			Guardian: "Druid",
		};

		return specMap[spec] || null;
	}

	/* ────────────────────────────────────────────── */
	/* SUMMARY GENERATION                            */
	/* ────────────────────────────────────────────── */

	getSummary(players) {
		const summary = {
			total: players.length,
			confirmed: 0,
			tentative: 0,
			late: 0,
			benched: 0,
			absence: 0,
			byClass: {},
			byRole: {
				tank: 0,
				healer: 0,
				dps: 0,
			},
		};

		players.forEach((player) => {
			// Count by status
			switch (player.status) {
				case "confirmed":
					summary.confirmed++;
					break;
				case "tentative":
					summary.tentative++;
					break;
				case "late":
					summary.late++;
					break;
				case "benched":
					summary.benched++;
					break;
				case "absence":
					summary.absence++;
					break;
			}

			// Count by class (skip if Unknown/Absence)
			if (player.class && player.class !== "Unknown") {
				summary.byClass[player.class] =
					(summary.byClass[player.class] || 0) + 1;
			}

			// Count by role (skip if absence)
			if (
				player.status !== "absence" &&
				player.roles &&
				player.roles.primary
			) {
				summary.byRole[player.roles.primary]++;
			}
		});

		return summary;
	}

	/* ────────────────────────────────────────────── */
	/* EXPORT METHODS                                 */
	/* ────────────────────────────────────────────── */

	exportToJSON(raid, groups) {
		return {
			metadata: {
				exportDate: new Date().toISOString(),
				raidSize: raid.size,
				faction: raid.faction,
				totalPlayers: raid.players.length,
			},
			composition: raid.composition,
			groups: groups.map((group) => group.toJSON()),
			players: raid.players.map((player) => player.toJSON()),
		};
	}

	exportToCSV(raid, groups) {
		const headers = [
			"Group",
			"Player Name",
			"Class",
			"Spec",
			"Role",
			"Gear Score",
			"Score",
			"Status",
		];

		const rows = [headers.join(",")];

		groups.forEach((group) => {
			group.players.forEach((player) => {
				const status = player.status || "confirmed";

				const row = [
					group.id,
					`"${player.name}"`,
					player.class,
					`"${player.spec}"`,
					player.roles.primary,
					player.gearScore,
					player.score,
					status,
				];
				rows.push(row.join(","));
			});
		});

		return rows.join("\n");
	}

	exportToText(raid, groups) {
		let text = "═══════════════════════════════════════════════════════\n";
		text += "       WOW CLASSIC RAID COMPOSITION\n";
		text += "═══════════════════════════════════════════════════════\n\n";

		text += `Raid Size: ${raid.size}\n`;
		text += `Faction: ${raid.faction}\n`;
		text += `Total Players: ${raid.players.length}\n\n`;

		text += "COMPOSITION:\n";
		text += `  Tanks: ${raid.composition.tanks}\n`;
		text += `  Healers: ${raid.composition.healers}\n`;
		text += `  DPS: ${raid.composition.dps}\n`;
		text += `  Utility: ${raid.composition.utility}\n\n`;

		text += "───────────────────────────────────────────────────────\n\n";

		groups.forEach((group) => {
			text += `GROUP ${group.id} (Score: ${group.score})\n`;
			text += "───────────────────────────────────────────────────────\n";

			group.players.forEach((player) => {
				const roleIcon =
					player.roles.primary === "tank"
						? "🛡️"
						: player.roles.primary === "healer"
						? "💚"
						: "⚔️";
				text += `${roleIcon} ${player.name.padEnd(
					20
				)} | ${player.class.padEnd(10)} | `;
				text += `${player.spec.padEnd(15)} | GS: ${player.gearScore}\n`;
			});

			text += "\n";
		});

		text += "═══════════════════════════════════════════════════════\n";

		return text;
	}
}

module.exports = { RaidHelperParser };
