const { Player, Raid, Group } = require('./models');
const SynergyCalculator = require('./synergy');
const GlobalOptimizer = require('./global-optimizer');

class RaidOptimizer {
    constructor(settings) {
        this.settings = {
            raidSize: settings.raidSize || 40,
            faction: settings.faction || 'neutral',
            healerPercentage: settings.healerPercentage || 25,
            minTanks: settings.minTanks || 2,
            classWeights: settings.classWeights || this.getDefaultClassWeights(),
            partySize: 5,
            optimizationMode: settings.optimizationMode || 'global' // 'global' or 'keep-groups'
        };
        this.synergyCalc = new SynergyCalculator();
    }

    getDefaultClassWeights() {
        return {
            'Warrior': 5,
            'Rogue': 4,
            'Hunter': 5,
            'Mage': 5,
            'Warlock': 5,
            'Priest': 6,
            'Druid': 5,
            'Shaman': 7,
            'Paladin': 6
        };
    }

    filterByFaction(players) {
        if (this.settings.faction === 'neutral') {
            return players;
        }

        return players.filter(player => {
            if (this.settings.faction === 'alliance' && player.class === 'Shaman') {
                return false;
            }
            if (this.settings.faction === 'horde' && player.class === 'Paladin') {
                return false;
            }
            return true;
        });
    }

    calculateRoleThresholds() {
        const size = this.settings.raidSize;
        const thresholds = {
            tanks: { min: 1, max: 5 },
            healers: { min: 1, max: 15 },
            dps: { min: 1, max: size }
        };

        // Adjust based on raid size
        if (size === 5) {
            thresholds.tanks = { min: 1, max: 1 };
            thresholds.healers = { min: 1, max: 1 };
            thresholds.dps = { min: 3, max: 3 };
        } else if (size === 10) {
            thresholds.tanks = { min: 1, max: 2 };
            thresholds.healers = { min: 2, max: 3 };
            thresholds.dps = { min: 5, max: 7 };
        } else if (size === 20) {
            thresholds.tanks = { min: 2, max: 3 };
            thresholds.healers = { min: 4, max: 6 };
            thresholds.dps = { min: 11, max: 14 };
        } else if (size === 25) {
            thresholds.tanks = { min: 2, max: 3 };
            thresholds.healers = { min: 5, max: 7 };
            thresholds.dps = { min: 15, max: 18 };
        } else if (size === 40) {
            thresholds.tanks = { min: 3, max: 5 };
            thresholds.healers = { min: 8, max: 12 };
            thresholds.dps = { min: 23, max: 29 };
        }

        // Apply healer percentage override
        const healerCount = Math.round(size * (this.settings.healerPercentage / 100));
        thresholds.healers.min = Math.max(thresholds.healers.min, healerCount - 2);
        thresholds.healers.max = Math.min(thresholds.healers.max, healerCount + 2);

        return thresholds;
    }

    scorePlayer(player, raid) {
        let score = 0;

        // Base score from gear score
        score += player.gearScore * 0.5;

        // Class weight bonus
        const classWeight = this.settings.classWeights[player.class] || 5;
        score += classWeight * 10;

        // Role scarcity bonus
        const roleCount = raid.getPlayersByRole(player.roles.primary).length;
        const thresholds = this.calculateRoleThresholds();
        
        if (player.roles.primary === 'tank' && roleCount < thresholds.tanks.min) {
            score += 100;
        } else if (player.roles.primary === 'healer' && roleCount < thresholds.healers.min) {
            score += 80;
        }

        // Buff diversity bonus
        const buffs = player.getBuffsProvided();
        score += buffs.length * 5;

        // Utility classes bonus
        if (['Shaman', 'Paladin', 'Druid'].includes(player.class)) {
            score += 20;
        }

        // Confirmation status
        if (player.isConfirmed) {
            score += 30;
        } else if (player.isTentative) {
            score += 10;
        }

        player.score = Math.round(score);
        return player.score;
    }

    selectPlayers(players) {
        const raid = new Raid(this.settings.raidSize, this.settings.faction);
        const thresholds = this.calculateRoleThresholds();

        // Filter by faction
        let availablePlayers = this.filterByFaction(players);

        // Remove benched players
        availablePlayers = availablePlayers.filter(p => !p.isBenched);

        // Score all players
        availablePlayers.forEach(player => this.scorePlayer(player, raid));

        // Sort by score (descending)
        availablePlayers.sort((a, b) => b.score - a.score);

        // Select players ensuring role requirements
        const selected = [];
        const roleCount = { tank: 0, healer: 0, dps: 0 };

        // First pass: Ensure minimum tanks
        const tanks = availablePlayers.filter(p => p.roles.primary === 'tank');
        for (let i = 0; i < Math.min(tanks.length, thresholds.tanks.max); i++) {
            if (roleCount.tank < thresholds.tanks.min || selected.length < this.settings.raidSize) {
                selected.push(tanks[i]);
                roleCount.tank++;
            }
        }

        // Second pass: Ensure minimum healers
        const healers = availablePlayers.filter(p => 
            p.roles.primary === 'healer' && !selected.includes(p)
        );
        for (let i = 0; i < Math.min(healers.length, thresholds.healers.max); i++) {
            if (roleCount.healer < thresholds.healers.min || selected.length < this.settings.raidSize) {
                selected.push(healers[i]);
                roleCount.healer++;
            }
        }

        // Third pass: Fill remaining slots with highest scored players
        const remaining = availablePlayers.filter(p => !selected.includes(p));
        for (const player of remaining) {
            if (selected.length >= this.settings.raidSize) break;
            
            selected.push(player);
            roleCount[player.roles.primary]++;
        }

        return selected;
    }

    createGroups(players) {
        const groups = [];
        const numGroups = Math.ceil(players.length / this.settings.partySize);

        // Initialize groups
        for (let i = 0; i < numGroups; i++) {
            groups.push(new Group(i + 1, this.settings.partySize));
        }

        // Categorize players by type for synergy-based grouping
        const playersByType = this.categorizePlayersByType(players);
        
        // Create specialized groups based on synergy
        let groupIndex = 0;
        
        // 1. Create melee groups (Warriors, Rogues, Feral Druids + Shamans)
        const meleeGroups = this.createMeleeGroups(playersByType, groups, groupIndex);
        groupIndex += meleeGroups.length;
        
        // 2. Create caster groups (Mages + Balance Druids + Healers)
        const casterGroups = this.createCasterGroups(playersByType, groups, groupIndex);
        groupIndex += casterGroups.length;
        
        // 3. Create warlock groups (Warlocks + Shadow Priests + Healers)
        const warlockGroups = this.createWarlockGroups(playersByType, groups, groupIndex);
        groupIndex += warlockGroups.length;
        
        // 4. Distribute remaining players to fill groups
        this.distributeRemainingPlayers(playersByType, groups);
        
        // 5. Balance healers across groups
        this.balanceHealersAcrossGroups(groups, playersByType);

        // Calculate synergy scores for all groups
        groups.forEach(group => {
            group.score = this.synergyCalc.calculateGroupSynergy(group.players);
        });

        // Filter out empty groups
        return groups.filter(g => g.players.length > 0);
    }

    categorizePlayersByType(players) {
        return {
            tanks: players.filter(p => p.roles.primary === 'tank'),
            healers: players.filter(p => p.roles.primary === 'healer'),
            meleeWarriors: players.filter(p => p.class === 'Warrior' && p.roles.primary === 'dps'),
            rogues: players.filter(p => p.class === 'Rogue'),
            feralDruids: players.filter(p => p.class === 'Druid' && p.spec.includes('Feral')),
            enhancementShamans: players.filter(p => p.class === 'Shaman' && p.spec.includes('Enhancement')),
            restoShamans: players.filter(p => p.class === 'Shaman' && p.spec.includes('Restoration')),
            mages: players.filter(p => p.class === 'Mage'),
            warlocks: players.filter(p => p.class === 'Warlock'),
            shadowPriests: players.filter(p => p.class === 'Priest' && p.spec.includes('Shadow')),
            balanceDruids: players.filter(p => p.class === 'Druid' && p.spec.includes('Balance')),
            hunters: players.filter(p => p.class === 'Hunter'),
            otherHealers: players.filter(p => 
                p.roles.primary === 'healer' && 
                !(p.class === 'Shaman' && p.spec.includes('Restoration'))
            ),
            assigned: new Set()
        };
    }

    createMeleeGroups(playersByType, groups, startIndex) {
        const meleeGroups = [];
        const { meleeWarriors, rogues, feralDruids, enhancementShamans, restoShamans, tanks, assigned } = playersByType;
        
        // Combine all melee DPS
        const allMelee = [...meleeWarriors, ...rogues, ...feralDruids, ...enhancementShamans];
        
        let groupIndex = startIndex;
        let currentGroup = [];
        
        for (const melee of allMelee) {
            if (assigned.has(melee.id)) continue;
            
            currentGroup.push(melee);
            assigned.add(melee.id);
            
            // When we have 3-4 melee, complete the group
            if (currentGroup.length >= 3) {
                // Add a restoration shaman if available (priority for melee groups)
                const shaman = restoShamans.find(s => !assigned.has(s.id));
                if (shaman) {
                    currentGroup.push(shaman);
                    assigned.add(shaman.id);
                }
                
                // Fill remaining slots with more melee or tanks
                while (currentGroup.length < 5) {
                    // Try to add another melee first
                    const nextMelee = allMelee.find(m => !assigned.has(m.id));
                    if (nextMelee) {
                        currentGroup.push(nextMelee);
                        assigned.add(nextMelee.id);
                        continue;
                    }
                    
                    // Then try a tank
                    const tank = tanks.find(t => !assigned.has(t.id));
                    if (tank) {
                        currentGroup.push(tank);
                        assigned.add(tank.id);
                        continue;
                    }
                    
                    break;
                }
                
                // Add group and start new one
                if (groupIndex < groups.length) {
                    currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
                    meleeGroups.push(groups[groupIndex]);
                    groupIndex++;
                }
                currentGroup = [];
            }
        }
        
        // Handle remaining melee in current group
        if (currentGroup.length > 0 && groupIndex < groups.length) {
            // Try to add a shaman healer
            const shaman = restoShamans.find(s => !assigned.has(s.id));
            if (shaman) {
                currentGroup.push(shaman);
                assigned.add(shaman.id);
            }
            
            currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
            meleeGroups.push(groups[groupIndex]);
        }
        
        return meleeGroups;
    }

    createCasterGroups(playersByType, groups, startIndex) {
        const casterGroups = [];
        const { mages, balanceDruids, otherHealers, assigned } = playersByType;
        
        let groupIndex = startIndex;
        let currentGroup = [];
        
        // Add mages to groups (max 4 per group to leave room for healer)
        for (const mage of mages) {
            if (assigned.has(mage.id)) continue;
            
            currentGroup.push(mage);
            assigned.add(mage.id);
            
            // When we have 3-4 mages, complete the group
            if (currentGroup.length >= 3) {
                // Try to add a balance druid for spell crit aura
                const boomkin = balanceDruids.find(b => !assigned.has(b.id));
                if (boomkin && currentGroup.length < 4) {
                    currentGroup.push(boomkin);
                    assigned.add(boomkin.id);
                }
                
                // Add one more mage if we don't have 4 yet
                if (currentGroup.length < 4) {
                    const nextMage = mages.find(m => !assigned.has(m.id));
                    if (nextMage) {
                        currentGroup.push(nextMage);
                        assigned.add(nextMage.id);
                    }
                }
                
                // Always try to add a healer to caster groups
                const healer = otherHealers.find(h => !assigned.has(h.id));
                if (healer && currentGroup.length < 5) {
                    currentGroup.push(healer);
                    assigned.add(healer.id);
                }
                
                // Add group and start new one
                if (groupIndex < groups.length) {
                    currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
                    casterGroups.push(groups[groupIndex]);
                    groupIndex++;
                }
                currentGroup = [];
            }
        }
        
        // Handle remaining mages
        if (currentGroup.length > 0 && groupIndex < groups.length) {
            // Try to add a balance druid
            const boomkin = balanceDruids.find(b => !assigned.has(b.id));
            if (boomkin) {
                currentGroup.push(boomkin);
                assigned.add(boomkin.id);
            }
            
            // Add a healer
            const healer = otherHealers.find(h => !assigned.has(h.id));
            if (healer) {
                currentGroup.push(healer);
                assigned.add(healer.id);
            }
            
            currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
            casterGroups.push(groups[groupIndex]);
        }
        
        return casterGroups;
    }

    createWarlockGroups(playersByType, groups, startIndex) {
        const warlockGroups = [];
        const { warlocks, shadowPriests, otherHealers, assigned } = playersByType;
        
        let groupIndex = startIndex;
        let currentGroup = [];
        
        // Add warlocks to groups (max 3-4 per group to leave room for shadow priest/healer)
        for (const warlock of warlocks) {
            if (assigned.has(warlock.id)) continue;
            
            currentGroup.push(warlock);
            assigned.add(warlock.id);
            
            // When we have 3 warlocks, complete the group
            if (currentGroup.length >= 3) {
                // Add a shadow priest for shadow weaving (priority)
                const spriest = shadowPriests.find(sp => !assigned.has(sp.id));
                if (spriest && currentGroup.length < 5) {
                    currentGroup.push(spriest);
                    assigned.add(spriest.id);
                }
                
                // Add one more warlock if we have space and no shadow priest
                if (currentGroup.length < 4 && !spriest) {
                    const nextLock = warlocks.find(w => !assigned.has(w.id));
                    if (nextLock) {
                        currentGroup.push(nextLock);
                        assigned.add(nextLock.id);
                    }
                }
                
                // Always try to add a healer to warlock groups
                if (currentGroup.length < 5) {
                    const healer = otherHealers.find(h => !assigned.has(h.id));
                    if (healer) {
                        currentGroup.push(healer);
                        assigned.add(healer.id);
                    }
                }
                
                // Add group and start new one
                if (groupIndex < groups.length) {
                    currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
                    warlockGroups.push(groups[groupIndex]);
                    groupIndex++;
                }
                currentGroup = [];
            }
        }
        
        // Handle remaining warlocks
        if (currentGroup.length > 0 && groupIndex < groups.length) {
            const spriest = shadowPriests.find(sp => !assigned.has(sp.id));
            if (spriest) {
                currentGroup.push(spriest);
                assigned.add(spriest.id);
            }
            
            // Add a healer
            const healer = otherHealers.find(h => !assigned.has(h.id));
            if (healer) {
                currentGroup.push(healer);
                assigned.add(healer.id);
            }
            
            currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
            warlockGroups.push(groups[groupIndex]);
        }
        
        return warlockGroups;
    }

    createHealerGroups(playersByType, groups, startIndex) {
        const healerGroups = [];
        const { otherHealers, assigned } = playersByType;
        
        let groupIndex = startIndex;
        
        // Group healers together if there are many
        if (otherHealers.length >= 4) {
            let currentGroup = [];
            
            for (const healer of otherHealers) {
                if (assigned.has(healer.id)) continue;
                
                currentGroup.push(healer);
                assigned.add(healer.id);
                
                if (currentGroup.length >= 5 && groupIndex < groups.length) {
                    currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
                    healerGroups.push(groups[groupIndex]);
                    groupIndex++;
                    currentGroup = [];
                }
            }
            
            // Handle remaining healers
            if (currentGroup.length > 0 && groupIndex < groups.length) {
                currentGroup.forEach(p => groups[groupIndex].addPlayer(p));
                healerGroups.push(groups[groupIndex]);
            }
        }
        
        return healerGroups;
    }

    distributeRemainingPlayers(playersByType, groups) {
        const { assigned } = playersByType;
        
        // Collect all unassigned players
        const allPlayers = [
            ...playersByType.tanks,
            ...playersByType.healers,
            ...playersByType.meleeWarriors,
            ...playersByType.rogues,
            ...playersByType.feralDruids,
            ...playersByType.enhancementShamans,
            ...playersByType.restoShamans,
            ...playersByType.mages,
            ...playersByType.warlocks,
            ...playersByType.shadowPriests,
            ...playersByType.balanceDruids,
            ...playersByType.hunters,
            ...playersByType.otherHealers
        ];
        
        const unassigned = allPlayers.filter(p => !assigned.has(p.id));
        
        // Distribute unassigned players to groups with space
        for (const player of unassigned) {
            // Find group with best synergy and space
            let bestGroup = null;
            let bestScore = -1;
            
            for (const group of groups) {
                if (group.players.length >= 5) continue;
                
                // Calculate synergy if we add this player
                const testPlayers = [...group.players, player];
                const score = this.synergyCalc.calculateGroupSynergy(testPlayers);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestGroup = group;
                }
            }
            
            if (bestGroup) {
                bestGroup.addPlayer(player);
                assigned.add(player.id);
            }
        }
    }

    balanceHealersAcrossGroups(groups, playersByType) {
        // Find groups without healers that have DPS
        const groupsWithoutHealers = groups.filter(g => {
            const hasHealer = g.players.some(p => p.roles.primary === 'healer');
            return g.players.length > 0 && !hasHealer && g.players.length < 5;
        });
        
        // Find groups with multiple healers (2+)
        const groupsWithMultipleHealers = groups.filter(g => {
            const healerCount = g.players.filter(p => p.roles.primary === 'healer').length;
            return healerCount >= 2;
        }).sort((a, b) => {
            const aHealers = a.players.filter(p => p.roles.primary === 'healer').length;
            const bHealers = b.players.filter(p => p.roles.primary === 'healer').length;
            return bHealers - aHealers; // Sort by most healers first
        });
        
        // Move healers from groups with multiple to groups without
        for (const targetGroup of groupsWithoutHealers) {
            if (targetGroup.players.length >= 5) continue;
            
            let healerMoved = false;
            for (const sourceGroup of groupsWithMultipleHealers) {
                const healers = sourceGroup.players.filter(p => p.roles.primary === 'healer');
                if (healers.length <= 1) continue;
                
                // Move one healer (prefer non-shaman healers from melee groups)
                let healerToMove = healers.find(h => h.class !== 'Shaman');
                if (!healerToMove) {
                    healerToMove = healers[healers.length - 1];
                }
                
                sourceGroup.removePlayer(healerToMove.id);
                targetGroup.addPlayer(healerToMove);
                healerMoved = true;
                
                break; // Move to next target group
            }
            
            if (!healerMoved) break; // No more healers to move
        }
    }

    optimize(players, mode = null) {
        // Use provided mode or fall back to settings
        const optimizationMode = mode || this.settings.optimizationMode;

        console.log(`\n🎯 Optimization Mode: ${optimizationMode}`);

        if (optimizationMode === 'global') {
            // Use global optimizer - build groups from scratch
            return this.optimizeGlobal(players);
        } else {
            // Use legacy optimizer - keep existing groups or build with old algorithm
            return this.optimizeLegacy(players);
        }
    }

    optimizeGlobal(players) {
        console.log('🌍 Using Global Optimization Algorithm');
        
        // Filter by faction
        let availablePlayers = this.filterByFaction(players);
        
        // Remove benched players
        availablePlayers = availablePlayers.filter(p => !p.isBenched);
        
        // Select best players for raid
        const selectedPlayers = this.selectPlayers(availablePlayers);
        
        console.log(`✅ Selected ${selectedPlayers.length} players for optimization`);
        
        // Use GlobalOptimizer to build groups from scratch
        const globalOptimizer = new GlobalOptimizer(selectedPlayers, this.settings);
        const raid = globalOptimizer.optimizeRaid();
        
        return {
            raid,
            groups: raid.groups,
            selectedPlayers,
            benchedPlayers: players.filter(p => !selectedPlayers.includes(p)),
            statistics: this.calculateStatistics(raid, raid.groups)
        };
    }

    optimizeLegacy(players) {
        console.log('📊 Using Legacy Optimization Algorithm (Keep Groups)');
        
        // Select best players for raid
        const selectedPlayers = this.selectPlayers(players);

        // Create optimized groups using legacy algorithm
        const groups = this.createGroups(selectedPlayers);

        // Create raid object
        const raid = new Raid(this.settings.raidSize, this.settings.faction);
        selectedPlayers.forEach(player => raid.addPlayer(player));
        raid.groups = groups;
        raid.calculateComposition();

        return {
            raid,
            groups,
            selectedPlayers,
            benchedPlayers: players.filter(p => !selectedPlayers.includes(p)),
            statistics: this.calculateStatistics(raid, groups)
        };
    }

    calculateStatistics(raid, groups) {
        const stats = {
            totalPlayers: raid.players.length,
            composition: raid.composition,
            classDistribution: raid.getClassDistribution(),
            averageGearScore: raid.getAverageGearScore(),
            totalGroups: groups.length,
            averageGroupScore: 0,
            buffCoverage: new Set()
        };

        // Calculate average group score
        const totalGroupScore = groups.reduce((sum, g) => sum + g.score, 0);
        stats.averageGroupScore = Math.round(totalGroupScore / groups.length);

        // Calculate total buff coverage
        groups.forEach(group => {
            group.buffs.forEach(buff => stats.buffCoverage.add(buff));
        });
        stats.buffCoverage = Array.from(stats.buffCoverage);

        return stats;
    }
}

module.exports = RaidOptimizer;