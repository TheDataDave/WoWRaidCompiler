const { Player } = require("./models");

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
		]);

		// Raid-Helper encodes attendance as fake "classes"
		this.ATTENDANCE_CLASSES = new Set([
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
	/* STATUS NORMALIZATION (SINGLE SOURCE OF TRUTH)  */
	/* ────────────────────────────────────────────── */

	normalizeStatus(entry) {
		// API payload
		if (entry.className) {
			if (entry.className === "Absence") return "absence";
			if (entry.className === "Bench") return "bench";
			if (entry.className === "Late") return "late";
			if (entry.className === "Tentative") return "tentative";
		}

		// JSON import payload
		if (entry.isAbsence || entry.class === "Absence") return "absence";
		if (entry.isBenched || entry.class === "Bench") return "bench";
		if (entry.isLate || entry.class === "Late") return "late";
		if (entry.isTentative || entry.class === "Tentative")
			return "tentative";

		return "confirmed";
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

			const status = this.normalizeStatus(entry);

			/* ─────────────── ABSENCE ─────────────── */

			if (status === "absence") {
				players.push(
					new Player({
						userid: entry.userid || entry.userId,
						name: entry.name,
						status,
						isAbsence: true,
						note: entry.note,
					})
				);
				return;
			}

			/* ─────────────── CLASS RESOLUTION ─────────────── */

			let wowClass =
				entry.className || entry.class || entry.class1 || null;

			// Attendance classes are NOT real WoW classes
			if (this.ATTENDANCE_CLASSES.has(wowClass)) {
				wowClass = null;
			}

			if (!this.WOW_CLASSES.has(wowClass)) {
				wowClass = this.inferClassFromSpec(
					entry.specName || entry.spec || entry.spec1
				);
			}

			if (!this.WOW_CLASSES.has(wowClass)) {
				warnings.push(
					`Slot ${index + 1} (${
						entry.name
					}): Unable to determine WoW class`
				);
				return;
			}

			/* ─────────────── PLAYER CREATION ─────────────── */

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

					isConfirmed: status === "confirmed",
					isTentative: status === "tentative",
					isLate: status === "late",
					isBenched: status === "bench",
					isAbsence: false,

					note: entry.note,

					partyId: entry.partyId,
					slotId: entry.slotId,
				})
			);
		});

		return {
			success: true,
			players,
			warnings,
			metadata: {
				totalSlots: source.length,
				parsedPlayers: players.length,
				emptySlots,
				byStatus: this.countByStatus(players),
				raidId: data._id || data.id,
				partyPerRaid: data.partyPerRaid,
				slotPerParty: data.slotPerParty,
			},
		};
	}

	/* ────────────────────────────────────────────── */
	/* CLASS INFERENCE (LAST RESORT ONLY)              */
	/* ────────────────────────────────────────────── */

	inferClassFromSpec(spec) {
		const map = {
			Arms: "Warrior",
			Fury: "Warrior",
			Protection: "Warrior",

			Holy1: "Paladin",
			Protection1: "Paladin",
			Retribution: "Paladin",

			Beastmastery: "Hunter",
			Marksmanship: "Hunter",
			Survival: "Hunter",

			Assassination: "Rogue",
			Combat: "Rogue",
			Subtlety: "Rogue",

			Discipline: "Priest",
			Holy: "Priest",
			Shadow: "Priest",
			Smite: "Priest",

			Elemental: "Shaman",
			Enhancement: "Shaman",
			Restoration1: "Shaman",

			Arcane: "Mage",
			Fire: "Mage",
			Frost: "Mage",

			Affliction: "Warlock",
			Demonology: "Warlock",
			Destruction: "Warlock",

			Balance: "Druid",
			Dreamstate: "Druid",
			Feral: "Druid",
			Restoration: "Druid",
			Guardian: "Druid",
		};

		return map[spec] || null;
	}

	/* ────────────────────────────────────────────── */
	/* SUMMARY HELPERS                                */
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
				case "bench":
					summary.benched++;
					break;
				case "absence":
					summary.absence++;
					return;
			}

			if (player.class) {
				summary.byClass[player.class] =
					(summary.byClass[player.class] || 0) + 1;
			}

			if (player.roles && player.roles.primary) {
				summary.byRole[player.roles.primary]++;
			}
		});

		return summary;
	}

	countByStatus(players) {
		return players.reduce(
			(acc, p) => {
				acc[p.status]++;
				return acc;
			},
			{
				confirmed: 0,
				tentative: 0,
				late: 0,
				bench: 0,
				absence: 0,
			}
		);
	}

	/* ────────────────────────────────────────────── */
	/* OPTIMIZER INPUT FILTER                         */
	/* ────────────────────────────────────────────── */

	getRaidParticipants(players) {
		return players.filter(
			(p) => p.status === "confirmed" || p.status === "late"
		);
	}
}

module.exports = { RaidHelperParser };
