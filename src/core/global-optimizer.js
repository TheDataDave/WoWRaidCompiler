const { Raid, Group } = require("./models");
const SynergyCalculator = require("./synergy");

/**
 * GlobalOptimizer - Builds optimal raid composition from scratch
 *
 * Group Priority Order:
 * 1. Melee Groups: Melee DPS + Enhancement/Resto Shaman + optionally Hunter/Feral
 * 2. Mage Groups: Mages + 1 Balance Druid
 * 3. Warlock Groups: Warlocks + 1 Shadow Priest
 * 4. Healer Group: Remaining healers grouped together (usually Group 8)
 *
 * Key Rule: EVERY tank MUST have a shaman in their group
 */
class GlobalOptimizer {
	constructor(players, settings) {
		this.players = players.filter((p) => p.isConfirmed);
		this.settings = {
			raidSize: settings.raidSize || 40,
			faction: settings.faction || "neutral",
			healerPercentage: settings.healerPercentage || 25,
			minTanks: settings.minTanks || 2,
			classWeights: settings.classWeights || {},
			partySize: 5,
		};
		this.synergyCalc = new SynergyCalculator();
		this.groups = [];
		this.assignedIds = new Set();
	}

	optimizeRaid() {
		console.log("🎯 Starting Global Optimization...");
		console.log(`📊 Total Players: ${this.players.length}`);
		console.log(`🎯 Target Raid Size: ${this.settings.raidSize}`);

		// Initialize groups
		const numGroups = Math.ceil(
			this.settings.raidSize / this.settings.partySize
		);
		this.initializeGroups(numGroups);

		// Categorize all players
		const cat = this.categorizePlayers();

		console.log(`\n📋 Player Breakdown:`);
		console.log(`  Tanks: ${cat.tanks.length}`);
		console.log(`  Warriors (DPS): ${cat.warriors.length}`);
		console.log(`  Rogues: ${cat.rogues.length}`);
		console.log(`  Feral Druids: ${cat.feralDruids.length}`);
		console.log(`  Hunters: ${cat.hunters.length}`);
		console.log(`  Resto Shamans: ${cat.restoShamans.length}`);
		console.log(`  Enhancement Shamans: ${cat.enhancementShamans.length}`);
		console.log(`  Elemental Shamans: ${cat.elementalShamans.length}`);
		console.log(`  Mages: ${cat.mages.length}`);
		console.log(`  Warlocks: ${cat.warlocks.length}`);
		console.log(`  Shadow Priests: ${cat.shadowPriests.length}`);
		console.log(`  Balance Druids: ${cat.balanceDruids.length}`);

		// Build groups in priority order
		console.log("\n🏗️ Building Groups in Priority Order:");

		// Phase 1: Create Tank+Shaman Groups (CRITICAL)
		console.log(
			"\n🛡️ Phase 1: Creating Tank+Shaman Groups (HIGHEST PRIORITY)"
		);
		this.createTankShamanGroups(cat);

		// Phase 2: Create Melee Groups (remaining melee + remaining shamans)
		console.log("\n⚔️ Phase 2: Creating Melee Groups");
		this.createMeleeGroups(cat);

		// Phase 2.5: Add Feral Druids to Melee Groups
		console.log("\n🐱 Phase 2.5: Adding Feral Druids to Melee Groups");
		this.addFeralsToMeleeGroups(cat);

		// Phase 2.75: Add Hunters to Melee Groups
		console.log("\n🏹 Phase 2.75: Adding Hunters to Melee Groups");
		this.addHuntersToMeleeGroups(cat);

		// Phase 3: Create Mage Groups (existing)
		console.log("\n❄️ Phase 3: Creating Mage Groups");
		this.createMageGroups(cat);

		// Phase 3: Create Mage Groups
		console.log("\n❄️ Phase 3: Creating Mage Groups");
		this.createMageGroups(cat);

		// Phase 4: Create Warlock Groups
		console.log("\n🔮 Phase 4: Creating Warlock Groups");
		this.createWarlockGroups(cat);

		// Phase 5: Create Hunter Groups (if enough hunters remain)
		console.log("\n🏹 Phase 5: Creating Hunter Groups");
		this.createHunterGroups(cat);

		// Phase 6: Distribute remaining DPS
		console.log("\n📦 Phase 6: Distributing Remaining DPS");
		this.distributeRemainingDPS(cat);

		// Phase 7: Create Healer Group (usually Group 8)
		console.log("\n💚 Phase 7: Creating Healer Group");
		this.createHealerGroup(cat);

		// Phase 8: Final distribution of any remaining players
		console.log("\n🔄 Phase 8: Final Distribution");
		this.finalDistribution(cat);

		// Phase 9: Optimize melee group composition
		console.log("\n🔧 Phase 9: Optimizing Melee Groups");
		this.optimizeMeleeGroups(cat);

		// Finalize and calculate scores
		const raid = this.finalizeRaid();
		this.printOptimizationSummary(raid);

		return raid;
	}

	initializeGroups(numGroups) {
		this.groups = [];
		for (let i = 0; i < numGroups; i++) {
			this.groups.push(new Group(i + 1));
		}
	}

	categorizePlayers() {
		return {
			// Tanks
			tanks: this.players.filter((p) => this.synergyCalc.isTank(p)),

			// Melee DPS
			warriors: this.players.filter(
				(p) => p.class === "Warrior" && !this.synergyCalc.isTank(p)
			),
			rogues: this.players.filter((p) => p.class === "Rogue"),
			feralDruids: this.players.filter((p) =>
				this.synergyCalc.isFeralDruid(p)
			),
			enhancementShamans: this.players.filter(
				(p) => p.class === "Shaman" && p.spec?.includes("Enhancement")
			),

			// Casters
			mages: this.players.filter((p) => this.synergyCalc.isMage(p)),
			warlocks: this.players.filter((p) => this.synergyCalc.isWarlock(p)),
			balanceDruids: this.players.filter((p) =>
				this.synergyCalc.isBalanceDruid(p)
			),
			shadowPriests: this.players.filter((p) =>
				this.synergyCalc.isShadowPriest(p)
			),
			elementalShamans: this.players.filter(
				(p) => p.class === "Shaman" && p.spec?.includes("Elemental")
			),

			// Ranged Physical
			hunters: this.players.filter((p) => this.synergyCalc.isHunter(p)),

			// Healers (prioritize shamans for tank groups)
			restoShamans: this.players.filter(
				(p) => p.class === "Shaman" && p.spec?.includes("Restoration")
			),
			holyPriests: this.players.filter(
				(p) =>
					p.class === "Priest" &&
					(p.spec?.includes("Holy") || p.spec?.includes("Discipline"))
			),
			holyPaladins: this.players.filter(
				(p) => p.class === "Paladin" && p.roles.primary === "healer"
			),
			restoDruids: this.players.filter(
				(p) => p.class === "Druid" && p.spec?.includes("Restoration")
			),
			otherHealers: this.players.filter(
				(p) =>
					p.roles.primary === "healer" &&
					!p.spec?.includes("Restoration") &&
					!p.spec?.includes("Holy") &&
					!p.spec?.includes("Discipline")
			),
		};
	}

	createTankShamanGroups(cat) {
		const availableTanks = cat.tanks.filter(
			(t) => !this.assignedIds.has(t.id)
		);
		const availableShamans = [
			...cat.restoShamans,
			...cat.enhancementShamans,
			...cat.elementalShamans,
		].filter((s) => !this.assignedIds.has(s.id));

		console.log(
			`  📊 Available: ${availableTanks.length} tanks, ${availableShamans.length} shamans`
		);

		if (availableTanks.length === 0) {
			console.log(`  ⚠️ No tanks available`);
			return 0;
		}

		if (availableShamans.length === 0) {
			console.log(`  ⚠️ WARNING: No shamans available for tanks!`);
			return 0;
		}

		// Strategy: Distribute tanks across shamans
		// If we have 3 tanks and 3 shamans: 1 tank per shaman
		// If we have 3 tanks and 2 shamans: 2 tanks in first group, 1 tank in second
		const tanksPerGroup = Math.ceil(
			availableTanks.length / availableShamans.length
		);
		const numGroups = Math.min(
			availableTanks.length,
			availableShamans.length
		);

		console.log(
			`  📐 Creating ${numGroups} tank groups with ~${tanksPerGroup} tank(s) each`
		);

		let tankIndex = 0;
		let groupIndex = 0;

		for (let i = 0; i < numGroups && groupIndex < this.groups.length; i++) {
			const group = this.groups[groupIndex];

			// Add shaman first (priority: Resto > Enhancement > Elemental)
			const shaman = availableShamans[i];
			this.addPlayerToGroup(group, shaman, `Shaman (${shaman.spec})`);

			// Add 1-2 tanks to this group
			const tanksToAdd =
				i === numGroups - 1
					? availableTanks.length - tankIndex // Last group gets remaining tanks
					: Math.min(tanksPerGroup, 2); // Max 2 tanks per group for balance

			for (
				let j = 0;
				j < tanksToAdd && tankIndex < availableTanks.length;
				j++
			) {
				const tank = availableTanks[tankIndex];
				this.addPlayerToGroup(group, tank, "Tank");
				tankIndex++;
			}

			group.groupType = "tank-melee";
			groupIndex++;
		}

		return groupIndex;
	}

	// NEW VERSION - Replace the existing createMeleeGroups method with this

	createMeleeGroups(cat) {
		// Get ONLY pure melee (Warriors, Rogues, Enhancement Shamans)
		// EXCLUDE Feral Druids and Hunters for now
		const pureMelee = [
			...cat.warriors,
			...cat.rogues,
			...cat.enhancementShamans,
		].filter((p) => !this.assignedIds.has(p.id));

		// Get remaining shamans for melee groups
		const availableShamans = [
			...cat.restoShamans,
			...cat.enhancementShamans,
			...cat.elementalShamans,
		].filter((s) => !this.assignedIds.has(s.id));

		console.log(
			`  📊 Available: ${pureMelee.length} pure melee, ${availableShamans.length} shamans`
		);

		// Create melee groups: 1 shaman + 3-4 PURE melee (no ferals/hunters yet)
		let groupsCreated = 0;
		while (
			pureMelee.filter((m) => !this.assignedIds.has(m.id)).length >= 3 &&
			availableShamans.filter((s) => !this.assignedIds.has(s.id)).length >
				0 &&
			groupsCreated < 3
		) {
			const group = this.findNextAvailableGroup();
			if (!group) break;

			const currentMelee = pureMelee.filter(
				(m) => !this.assignedIds.has(m.id)
			);
			const currentShamans = availableShamans.filter(
				(s) => !this.assignedIds.has(s.id)
			);

			// Add shaman
			const shaman = currentShamans[0];
			this.addPlayerToGroup(group, shaman, `Shaman (${shaman.spec})`);

			// Add 3-4 PURE melee (Warriors and Rogues only, prioritize Warriors)
			const meleeByPriority = [
				...currentMelee.filter((m) => m.class === "Warrior"),
				...currentMelee.filter((m) => m.class === "Rogue"),
				...currentMelee.filter((m) => m.class === "Shaman"),
			];

			const meleeToAdd = Math.min(4, meleeByPriority.length);
			for (let i = 0; i < meleeToAdd; i++) {
				if (
					meleeByPriority[i] &&
					!this.assignedIds.has(meleeByPriority[i].id)
				) {
					this.addPlayerToGroup(
						group,
						meleeByPriority[i],
						"Melee DPS"
					);
				}
			}

			group.groupType = "melee";
			groupsCreated++;
		}

		return groupsCreated;
	}

	createMageGroups(cat) {
		const availableMages = cat.mages.filter(
			(m) => !this.assignedIds.has(m.id)
		);
		const availableBoomkins = cat.balanceDruids.filter(
			(b) => !this.assignedIds.has(b.id)
		);

		console.log(
			`  📊 Available: ${availableMages.length} mages, ${availableBoomkins.length} balance druids`
		);

		let groupsCreated = 0;

		// Create mage groups: 1 Balance Druid + 3-4 Mages
		while (
			availableMages.filter((m) => !this.assignedIds.has(m.id)).length >=
				3 &&
			groupsCreated < 3
		) {
			const group = this.findNextAvailableGroup();
			if (!group) break;

			// Add Balance Druid first (if available)
			const boomkin = availableBoomkins.find(
				(b) => !this.assignedIds.has(b.id)
			);
			if (boomkin) {
				this.addPlayerToGroup(
					group,
					boomkin,
					"Balance Druid (Spell Crit Aura)"
				);
			}

			// Add 4 mages (or fill to 5)
			const currentMages = availableMages.filter(
				(m) => !this.assignedIds.has(m.id)
			);
			const magesToAdd = Math.min(
				5 - group.players.length,
				currentMages.length
			);
			for (let i = 0; i < magesToAdd; i++) {
				this.addPlayerToGroup(group, currentMages[i], "Mage");
			}

			group.groupType = "mage";
			groupsCreated++;
		}
	}

	createWarlockGroups(cat) {
		const availableWarlocks = cat.warlocks.filter(
			(w) => !this.assignedIds.has(w.id)
		);
		const availableShadowPriests = cat.shadowPriests.filter(
			(sp) => !this.assignedIds.has(sp.id)
		);

		console.log(
			`  📊 Available: ${availableWarlocks.length} warlocks, ${availableShadowPriests.length} shadow priests`
		);

		let groupsCreated = 0;

		// Create warlock groups: 1 Shadow Priest + 3-4 Warlocks
		while (
			availableWarlocks.filter((w) => !this.assignedIds.has(w.id))
				.length >= 3 &&
			groupsCreated < 3
		) {
			const group = this.findNextAvailableGroup();
			if (!group) break;

			// Add Shadow Priest first (if available)
			const spriest = availableShadowPriests.find(
				(sp) => !this.assignedIds.has(sp.id)
			);
			if (spriest) {
				this.addPlayerToGroup(
					group,
					spriest,
					"Shadow Priest (Shadow Weaving)"
				);
			}

			// Add 4 warlocks (or fill to 5)
			const currentWarlocks = availableWarlocks.filter(
				(w) => !this.assignedIds.has(w.id)
			);
			const warlocksToAdd = Math.min(
				5 - group.players.length,
				currentWarlocks.length
			);
			for (let i = 0; i < warlocksToAdd; i++) {
				this.addPlayerToGroup(group, currentWarlocks[i], "Warlock");
			}

			group.groupType = "warlock";
			groupsCreated++;
		}
	}

	createHunterGroups(cat) {
		const availableHunters = cat.hunters.filter(
			(h) => !this.assignedIds.has(h.id)
		);

		console.log(`  📊 Available: ${availableHunters.length} hunters`);

		// Only create hunter group if we have 3+ hunters left
		if (availableHunters.length >= 3) {
			const group = this.findNextAvailableGroup();
			if (group) {
				const huntersToAdd = Math.min(5, availableHunters.length);
				for (let i = 0; i < huntersToAdd; i++) {
					this.addPlayerToGroup(group, availableHunters[i], "Hunter");
				}

				group.groupType = "hunter";
			}
		}
	}

	distributeRemainingDPS(cat) {
		const remainingDPS = this.players.filter(
			(p) => !this.assignedIds.has(p.id) && p.roles.primary === "dps"
		);

		console.log(`  📊 Remaining DPS: ${remainingDPS.length}`);

		for (const player of remainingDPS) {
			const group = this.findBestGroupForPlayer(player);
			if (group && group.players.length < 5) {
				this.addPlayerToGroup(group, player, `${player.class} (Fill)`);
			}
		}
	}

	createHealerGroup(cat) {
		const remainingHealers = [
			...cat.holyPriests,
			...cat.holyPaladins,
			...cat.restoDruids,
			...cat.restoShamans,
			...cat.otherHealers,
		].filter((h) => !this.assignedIds.has(h.id));

		console.log(`  📊 Remaining healers: ${remainingHealers.length}`);

		if (remainingHealers.length >= 3) {
			// Try to use last group
			const healerGroup = this.groups[this.groups.length - 1];

			if (healerGroup.players.length < 3) {
				// Move existing players if needed
				if (healerGroup.players.length > 0) {
					const toMove = [...healerGroup.players];
					toMove.forEach((p) => {
						healerGroup.removePlayer(p.id);
						this.assignedIds.delete(p.id);
					});

					for (const player of toMove) {
						const newGroup = this.findBestGroupForPlayer(player);
						if (newGroup && newGroup.id !== healerGroup.id) {
							this.addPlayerToGroup(
								newGroup,
								player,
								"Redistributed"
							);
						}
					}
				}

				console.log(
					`  💚 Creating Healer Group (Group ${healerGroup.id})`
				);

				const healersToAdd = Math.min(5, remainingHealers.length);
				for (let i = 0; i < healersToAdd; i++) {
					this.addPlayerToGroup(
						healerGroup,
						remainingHealers[i],
						"Healer"
					);
				}

				healerGroup.groupType = "healer";
			}
		} else {
			// Distribute to groups without healers
			for (const healer of remainingHealers) {
				const group = this.findGroupNeedingHealer();
				if (group) {
					this.addPlayerToGroup(group, healer, "Healer");
				}
			}
		}
	}

	finalDistribution(cat) {
		const remaining = this.players.filter(
			(p) => !this.assignedIds.has(p.id)
		);

		console.log(`  📊 Remaining unassigned: ${remaining.length}`);

		for (const player of remaining) {
			const group = this.findBestGroupForPlayer(player);
			if (group && group.players.length < 5) {
				this.addPlayerToGroup(group, player, `${player.class} (Final)`);
			}
		}
	}

	// SIMPLIFIED VERSION - Replace the existing optimizeMeleeGroups method with this
	// Since we're now handling Ferals and Hunters proactively, this phase is mainly for healers

	optimizeMeleeGroups(cat) {
		// This phase is now mainly for ensuring healers in melee groups
		const meleeGroups = this.groups.filter(
			(g) => g.groupType === "melee" || g.groupType === "tank-melee"
		);

		console.log(
			`  📊 Checking ${meleeGroups.length} melee groups for healers`
		);

		for (const group of meleeGroups) {
			// Ensure every melee group has a healer if possible
			const hasHealer = group.players.some(
				(p) => p.roles.primary === "healer"
			);
			if (!hasHealer && group.players.length < 5) {
				const healer = this.findAvailableHealer(cat);
				if (healer) {
					this.addPlayerToGroup(
						group,
						healer,
						"Healer (Optimization)"
					);
				}
			}
		}
	}

	findPlayerToSwap(playerList, type) {
		for (const player of playerList) {
			const group = this.findPlayerGroup(player);
			if (
				group &&
				group.groupType !== "melee" &&
				group.groupType !== "tank-melee"
			) {
				return { ...player, currentGroup: group };
			}
		}
		return null;
	}

	findMeleeToSwapOut(group) {
		// Prefer warriors/rogues that aren't needed as much
		const warriors = group.players.filter(
			(p) => p.class === "Warrior" && !this.synergyCalc.isTank(p)
		);
		const rogues = group.players.filter((p) => p.class === "Rogue");

		// Return the last warrior or rogue
		if (warriors.length > 2) return warriors[warriors.length - 1];
		if (rogues.length > 1) return rogues[rogues.length - 1];

		return null;
	}

	findPlayerGroup(player) {
		return this.groups.find((g) =>
			g.players.some((p) => p.id === player.id)
		);
	}

	findAvailableHealer(cat) {
		const allHealers = [
			...cat.holyPriests,
			...cat.holyPaladins,
			...cat.restoDruids,
			...cat.otherHealers,
		];

		return allHealers.find((h) => !this.assignedIds.has(h.id));
	}

	findNextAvailableGroup() {
		return this.groups.find((g) => g.players.length === 0);
	}

	findBestGroupForPlayer(player) {
		let bestGroup = null;
		let bestScore = -Infinity;

		for (const group of this.groups) {
			if (group.players.length >= 5) continue;

			const score = this.calculateGroupFitScore(group, player);
			if (score > bestScore) {
				bestScore = score;
				bestGroup = group;
			}
		}

		return bestGroup;
	}

	findGroupNeedingHealer() {
		// Find group without healer that has space
		for (const group of this.groups) {
			if (group.players.length < 5) {
				const hasHealer = group.players.some(
					(p) => p.roles.primary === "healer"
				);
				if (!hasHealer) return group;
			}
		}

		// Otherwise return any group with space
		return this.groups.find((g) => g.players.length < 5);
	}

	calculateGroupFitScore(group, player) {
		let score = 0;

		// Base synergy with existing members
		for (const member of group.players) {
			score += this.synergyCalc.calculatePlayerSynergy(player, member);
		}

		// Group type bonuses
		if (group.groupType === "melee" && this.synergyCalc.isMelee(player)) {
			score += 50;
		} else if (
			group.groupType === "tank-melee" &&
			this.synergyCalc.isMelee(player)
		) {
			score += 50;
		} else if (
			group.groupType === "mage" &&
			this.synergyCalc.isMage(player)
		) {
			score += 50;
		} else if (
			group.groupType === "warlock" &&
			this.synergyCalc.isWarlock(player)
		) {
			score += 50;
		} else if (
			group.groupType === "hunter" &&
			this.synergyCalc.isHunter(player)
		) {
			score += 50;
		}

		// Role balance
		const healerCount = group.players.filter(
			(p) => p.roles.primary === "healer"
		).length;
		if (player.roles.primary === "healer" && healerCount === 0) {
			score += 40;
		} else if (player.roles.primary === "healer" && healerCount >= 1) {
			score -= 30;
		}

		return score;
	}

	addPlayerToGroup(group, player, role) {
		group.addPlayer(player);
		this.assignedIds.add(player.id);
		console.log(
			`  ✅ Group ${group.id}: ${player.name} (${player.class} - ${
				player.spec || "N/A"
			}) [${role}]`
		);
	}

	// NEW METHOD - Add this method to the GlobalOptimizer class

	addFeralsToMeleeGroups(cat) {
		const availableFeralDruids = cat.feralDruids.filter(
			(f) => !this.assignedIds.has(f.id)
		);

		console.log(
			`  📊 Available: ${availableFeralDruids.length} feral druids`
		);

		// Find melee groups that have space (less than 5 players)
		const meleeGroups = this.groups.filter(
			(g) =>
				(g.groupType === "melee" || g.groupType === "tank-melee") &&
				g.players.length < 5
		);

		// Sort melee groups by number of melee DPS (prioritize groups with most melee)
		meleeGroups.sort((a, b) => {
			const aMeleeCount = a.players.filter(
				(p) =>
					this.synergyCalc.isMelee(p) && !this.synergyCalc.isTank(p)
			).length;
			const bMeleeCount = b.players.filter(
				(p) =>
					this.synergyCalc.isMelee(p) && !this.synergyCalc.isTank(p)
			).length;
			return bMeleeCount - aMeleeCount;
		});

		let feralsAdded = 0;
		for (const feral of availableFeralDruids) {
			if (this.assignedIds.has(feral.id)) continue;

			// Find a melee group without a feral
			const targetGroup = meleeGroups.find(
				(g) =>
					g.players.length < 5 &&
					!g.players.some((p) => this.synergyCalc.isFeralDruid(p))
			);

			if (targetGroup) {
				this.addPlayerToGroup(
					targetGroup,
					feral,
					"Feral Druid (Leader of the Pack)"
				);
				feralsAdded++;
				console.log(
					`  ✅ Added ${feral.name} to Group ${targetGroup.id}`
				);
			}
		}

		console.log(`  📊 Added ${feralsAdded} feral druids to melee groups`);
	}

	// NEW METHOD - Add this method to the GlobalOptimizer class

	addHuntersToMeleeGroups(cat) {
		const availableHunters = cat.hunters.filter(
			(h) => !this.assignedIds.has(h.id)
		);

		console.log(`  📊 Available: ${availableHunters.length} hunters`);

		// Find melee groups that have space and would benefit from Trueshot Aura
		const meleeGroups = this.groups.filter(
			(g) =>
				(g.groupType === "melee" || g.groupType === "tank-melee") &&
				g.players.length < 5
		);

		// Sort melee groups by number of melee DPS (prioritize groups with most melee)
		meleeGroups.sort((a, b) => {
			const aMeleeCount = a.players.filter(
				(p) =>
					this.synergyCalc.isMelee(p) && !this.synergyCalc.isTank(p)
			).length;
			const bMeleeCount = b.players.filter(
				(p) =>
					this.synergyCalc.isMelee(p) && !this.synergyCalc.isTank(p)
			).length;
			return bMeleeCount - aMeleeCount;
		});

		let huntersAdded = 0;
		for (const hunter of availableHunters) {
			if (this.assignedIds.has(hunter.id)) continue;

			// Find a melee group without a hunter
			const targetGroup = meleeGroups.find(
				(g) =>
					g.players.length < 5 &&
					!g.players.some((p) => this.synergyCalc.isHunter(p))
			);

			if (targetGroup) {
				this.addPlayerToGroup(
					targetGroup,
					hunter,
					"Hunter (Trueshot Aura)"
				);
				huntersAdded++;
				console.log(
					`  ✅ Added ${hunter.name} to Group ${targetGroup.id}`
				);
			}
		}

		console.log(`  📊 Added ${huntersAdded} hunters to melee groups`);
	}

	finalizeRaid() {
		const raid = new Raid(this.settings.raidSize, this.settings.faction);

		for (const group of this.groups) {
			if (group.players.length === 0) continue;

			group.synergyScore = this.synergyCalc.calculateGroupSynergy(
				group.players
			);
			group.score = group.synergyScore;

			for (const player of group.players) {
				raid.addPlayer(player);
			}
		}

		raid.groups = this.groups.filter((g) => g.players.length > 0);

		return raid;
	}

	printOptimizationSummary(raid) {
		console.log("\n" + "=".repeat(60));
		console.log("📊 OPTIMIZATION SUMMARY");
		console.log("=".repeat(60));

		const stats = raid.getCompositionStats();
		console.log(`\n👥 Total Players: ${stats.totalPlayers}`);
		console.log(`🏰 Groups: ${raid.groups.length}`);
		console.log(`🛡️ Tanks: ${stats.tanks}`);
		console.log(`💚 Healers: ${stats.healers}`);
		console.log(`⚔️ DPS: ${stats.dps}`);

		console.log("\n🎯 Group Composition:");
		raid.groups.forEach((g) => {
			const tanks = g.players.filter((p) =>
				this.synergyCalc.isTank(p)
			).length;
			const healers = g.players.filter(
				(p) => p.roles.primary === "healer"
			).length;
			const shamans = g.players.filter(
				(p) => p.class === "Shaman"
			).length;
			const melee = g.players.filter((p) =>
				this.synergyCalc.isMelee(p)
			).length;
			const hunters = g.players.filter((p) =>
				this.synergyCalc.isHunter(p)
			).length;
			const ferals = g.players.filter((p) =>
				this.synergyCalc.isFeralDruid(p)
			).length;

			console.log(
				`  Group ${g.id} (${g.groupType || "mixed"}): ${
					g.players.length
				} players - T:${tanks} H:${healers} S:${shamans} M:${melee} Hun:${hunters} Fer:${ferals}`
			);
		});

		console.log("\n📈 Group Synergy Scores:");
		let totalSynergy = 0;
		raid.groups.forEach((g) => {
			console.log(`  Group ${g.id}: ${g.synergyScore}`);
			totalSynergy += g.synergyScore;
		});
		console.log(`  Total Raid Synergy: ${totalSynergy}`);
		console.log(
			`  Average Group Synergy: ${(
				totalSynergy / raid.groups.length
			).toFixed(1)}`
		);

		console.log("\n" + "=".repeat(60));
	}
}

module.exports = GlobalOptimizer;
