const { Player } = require("./models");
const { normalizeStatus: normalizeStatusEnum, isValidStatus, shouldExclude } = require('./status-enums');

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
	/* STATUS NORMALIZATION                           */
	/* ────────────────────────────────────────────── */

	normalizeStatus(entry) {
		// Determine raw status from entry
		let rawStatus = null;
		
		// API payload - className field
		if (entry.className) {
			rawStatus = entry.className;
		}
		// JSON import payload - boolean flags
		else if (entry.isAbsence || entry.class === "Absence") {
			rawStatus = "absence";
		}
		else if (entry.isBenched || entry.class === "Bench") {
			rawStatus = "bench";
		}
		else if (entry.isLate || entry.class === "Late") {
			rawStatus = "late";
		}
		else if (entry.isTentative || entry.class === "Tentative") {
			rawStatus = "tentative";
		}
		else {
			rawStatus = "confirmed";
		}
		
		// Use the centralized status normalization
		return normalizeStatusEnum(rawStatus, "confirmed");
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

			/* ─────────── ABSENCE ─────────── */

			if (status === "absent") {
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

			/* ─────────── CLASS RESOLUTION ─────────── */

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

					isConfirmed: status === "confirmed",
					isTentative: status === "tentative",
					isLate: status === "late",
					isBenched: status === "benched",
					isAbsence: false,

					note: entry.note,
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
			Retribution: "Paladin",

			// Hunter
			"Beast Mastery": "Hunter",
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
			Feral: "Druid",
		};

		return specMap[spec] || null;
	}
}

module.exports = { RaidHelperParser };