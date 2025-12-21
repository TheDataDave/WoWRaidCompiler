// WoW Classic Synergy and Buff System
class SynergyCalculator {
	constructor() {
		// Windfury priority order
		this.windfuryPriority = {
			tank: 3,
			warrior: 2,
			rogue: 1,
			hunter: 0,
		};

		// Define class synergies and optimal group compositions
		this.synergyGroups = {
			melee: {
				classes: ["Warrior", "Rogue"],
				specs: [
					"Fury",
					"Arms",
					"Combat",
					"Protection",
					"Assassination",
					"Subtlety",
					"Feral",
					"Enhancement",
				],
				buffs: ["Windfury Totem", "Strength of Earth", "Grace of Air"],
				providers: ["Shaman"],
				ideal: { warriors: 3, rogues: 1, shamans: 1 },
			},
			caster: {
				classes: ["Mage", "Warlock"],
				specs: [
					"Fire",
					"Frost",
					"Arcane",
					"Affliction",
					"Destruction",
					"Demonology",
					"Shadow",
					"Balance",
				],
				buffs: ["Arcane Intellect", "Moonkin Aura"],
				providers: ["Druid"],
				ideal: { mages: 4, boomkin: 1 },
			},
			warlock: {
				classes: ["Warlock"],
				specs: ["Affliction", "Destruction", "Demonology"],
				buffs: ["Shadow Weaving", "Curse of Elements"],
				providers: ["Priest"],
				ideal: { warlocks: 4, shadowPriest: 1 },
			},
			hunter: {
				classes: ["Hunter"],
				specs: ["Marksmanship", "Beast Mastery", "Survival"],
				buffs: ["Trueshot Aura"],
				providers: [],
				ideal: { hunters: 3, melee: 2 },
			},
		};
	}

	// --------------------
	// WINDfURY PRIORITY
	// --------------------
	getWindfuryPriority(player) {
		if (this.isTank(player)) return this.windfuryPriority.tank;
		if (player.class === "Warrior") return this.windfuryPriority.warrior;
		if (player.class === "Rogue") return this.windfuryPriority.rogue;
		if (this.isHunter(player)) return this.windfuryPriority.hunter;
		return 0;
	}

	// --------------------
	// PLAYER SYNERGY
	// --------------------
	calculatePlayerSynergy(player1, player2) {
		// --------------------
		// HARD SYNERGIES (exclusive)
		// --------------------
		// Tank + Shaman = absolute priority
		if (
			(this.isTank(player1) && this.isShaman(player2)) ||
			(this.isTank(player2) && this.isShaman(player1))
		) {
			console.log("TANK + SHAMEN!!");
			return 1000;
		}

		let score = 0;

		// --------------------
		// SOFT ROLE DEFINITIONS
		// --------------------
		const p1 = {
			isTank: this.isTank(player1),
			isMelee: this.isMelee(player1) && !this.isTank(player1),
			isCaster: this.isCaster(player1),
			isShaman: this.isShaman(player1),
		};

		const p2 = {
			isTank: this.isTank(player2),
			isMelee: this.isMelee(player2) && !this.isTank(player2),
			isCaster: this.isCaster(player2),
			isShaman: this.isShaman(player2),
		};

		// --------------------
		// MELEE SYNERGY (non-tank only)
		// --------------------
		if (p1.isMelee && p2.isMelee) {
			score += 10;
		}

		// --------------------
		// WINDFURY (non-tank weighting)
		// --------------------
		if (p1.isShaman && (p2.isMelee || p2.isTank)) {
			score += 20 + this.getWindfuryPriority(player2) * 10;
		}

		if (p2.isShaman && (p1.isMelee || p1.isTank)) {
			score += 20 + this.getWindfuryPriority(player1) * 10;
		}

		// --------------------
		// CASTER SYNERGY
		// --------------------
		if (p1.isCaster && p2.isCaster) {
			score += 10;
		}

		// Mage + Balance Druid
		if (
			(this.isMage(player1) && this.isBalanceDruid(player2)) ||
			(this.isMage(player2) && this.isBalanceDruid(player1))
		) {
			score += 25;
		}

		// Warlock + Shadow Priest
		if (
			(this.isWarlock(player1) && this.isShadowPriest(player2)) ||
			(this.isWarlock(player2) && this.isShadowPriest(player1))
		) {
			score += 25;
		}

		// --------------------
		// SECONDARY SYNERGIES
		// --------------------

		// Hunter + Melee
		if (
			(this.isHunter(player1) && p2.isMelee) ||
			(this.isHunter(player2) && p1.isMelee)
		) {
			score += 10;
		}

		// Feral Druid + Melee
		if (
			(this.isFeralDruid(player1) && p2.isMelee) ||
			(this.isFeralDruid(player2) && p1.isMelee)
		) {
			score += 15;
		}

		return score;
	}

	// --------------------
	// GROUP SYNERGY
	// --------------------
	calculateGroupSynergy(players) {
		console.log(players);
		let totalScore = 0;

		for (let i = 0; i < players.length; i++) {
			for (let j = i + 1; j < players.length; j++) {
				totalScore += this.calculatePlayerSynergy(
					players[i],
					players[j]
				);
			}
		}

		totalScore += this.getCompositionBonus(players);
		return totalScore;
	}

	getCompositionBonus(players) {
		let bonus = 0;
		const counts = this.countPlayerTypes(players);

		// Core Windfury group (Tank + Shaman)
		if (counts.tanks >= 1 && counts.shamans >= 1) {
			bonus += 60;
		}

		// Melee core before hunters
		if (counts.melee >= 3 && counts.shamans >= 1) {
			bonus += 50;
		}

		// Hunters only after melee is satisfied
		if (counts.melee >= 3 && counts.shamans >= 1 && counts.hunters >= 1) {
			bonus += 25;
		}

		// Caster group bonus
		if (counts.mages >= 3 && counts.balanceDruids >= 1) {
			bonus += 40;
		}

		// Warlock group bonus
		if (counts.warlocks >= 3 && counts.shadowPriests >= 1) {
			bonus += 40;
		}

		return bonus;
	}

	// --------------------
	// TYPE COUNTING
	// --------------------
	countPlayerTypes(players) {
		return {
			melee: players.filter((p) => this.isMelee(p)).length,
			casters: players.filter((p) => this.isCaster(p)).length,
			mages: players.filter((p) => this.isMage(p)).length,
			warlocks: players.filter((p) => this.isWarlock(p)).length,
			hunters: players.filter((p) => this.isHunter(p)).length,
			shamans: players.filter((p) => this.isShaman(p)).length,
			balanceDruids: players.filter((p) => this.isBalanceDruid(p)).length,
			shadowPriests: players.filter((p) => this.isShadowPriest(p)).length,
			feralDruids: players.filter((p) => this.isFeralDruid(p)).length,
			healers: players.filter((p) => p.roles.primary === "healer").length,
			tanks: players.filter((p) => p.roles.primary === "tank").length,
		};
	}

	// --------------------
	// HELPERS
	// --------------------
	isTank(player) {
		// HARD REQUIREMENT: explicit tank role
		if (player.roles?.primary === "tank") {
			return true;
		}

		// Optional fallback (only if role data is missing)
		const trueTankSpecs = ["Protection"];
		return trueTankSpecs.some(
			(spec) =>
				player.spec &&
				player.spec.toLowerCase().includes(spec.toLowerCase())
		);
	}

	isMelee(player) {
		if (this.isTank(player)) return true;

		const meleeClasses = ["Warrior", "Rogue"];
		const meleeSpecs = [
			"Fury",
			"Arms",
			"Combat",
			"Protection",
			"Assassination",
			"Subtlety",
			"Feral",
			"Enhancement",
		];
		return (
			meleeClasses.includes(player.class) ||
			meleeSpecs.some((spec) => player.spec.includes(spec))
		);
	}

	isCaster(player) {
		const casterClasses = ["Mage", "Warlock"];
		const casterSpecs = [
			"Fire",
			"Frost",
			"Arcane",
			"Affliction",
			"Destruction",
			"Demonology",
			"Shadow",
			"Balance",
		];
		return (
			casterClasses.includes(player.class) ||
			casterSpecs.some((spec) => player.spec.includes(spec))
		);
	}

	isMage(player) {
		return player.class === "Mage";
	}

	isWarlock(player) {
		return player.class === "Warlock";
	}

	isHunter(player) {
		return player.class === "Hunter";
	}

	isShaman(player) {
		return player.class === "Shaman";
	}

	isBalanceDruid(player) {
		return player.class === "Druid" && player.spec.includes("Balance");
	}

	isShadowPriest(player) {
		return player.class === "Priest" && player.spec.includes("Shadow");
	}

	isFeralDruid(player) {
		return player.class === "Druid" && player.spec.includes("Feral");
	}

	// --------------------
	// IDEAL GROUP TYPE
	// --------------------
	getIdealGroupType(player) {
		if (this.isMelee(player)) return "melee";
		if (this.isMage(player)) return "caster";
		if (this.isWarlock(player)) return "warlock";
		if (this.isHunter(player)) return "melee"; // melee-adjacent
		if (this.isShaman(player)) return "melee";
		if (this.isBalanceDruid(player)) return "caster";
		if (this.isShadowPriest(player)) return "warlock";
		if (player.roles.primary === "healer") return "healer";
		if (player.roles.primary === "tank") return "tank";
		return "flex";
	}
}

module.exports = SynergyCalculator;
