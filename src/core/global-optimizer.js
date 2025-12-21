const { Raid, Group } = require('./models');
const SynergyCalculator = require('./synergy');

/**
 * GlobalOptimizer - Builds optimal raid composition from scratch
 * 
 * This optimizer treats all players as a single pool and builds groups
 * to maximize total raid synergy, rather than scoring pre-existing groups.
 * 
 * Algorithm:
 * 1. Build pairwise synergy matrix for all players
 * 2. Identify high-value synergy cores (Tank+Shaman, Warlock+ShadowPriest, etc.)
 * 3. Seed groups with cores (highest priority first)
 * 4. Fill remaining slots by maximizing incremental synergy
 * 5. Distribute healers across groups
 * 6. Validate role thresholds
 */
class GlobalOptimizer {
    constructor(players, settings) {
        this.players = players;
        this.settings = {
            raidSize: settings.raidSize || 40,
            faction: settings.faction || 'neutral',
            healerPercentage: settings.healerPercentage || 25,
            minTanks: settings.minTanks || 2,
            classWeights: settings.classWeights || {},
            partySize: 5
        };
        this.synergyCalc = new SynergyCalculator();
        this.synergyMatrix = null;
        this.groups = [];
    }

    /**
     * Main optimization entry point
     * @returns {Raid} Optimized raid composition
     */
    optimizeRaid() {
        console.log('🎯 Starting Global Optimization...');
        console.log(`📊 Total Players: ${this.players.length}`);
        console.log(`🎯 Target Raid Size: ${this.settings.raidSize}`);

        // Step 1: Build synergy matrix
        console.log('\n📈 Building synergy matrix...');
        this.buildSynergyMatrix();

        // Step 2: Identify synergy cores
        console.log('\n🔍 Identifying synergy cores...');
        const cores = this.identifySynergyCores();
        console.log(`✅ Found ${cores.length} synergy cores`);

        // Step 3: Initialize groups
        const numGroups = Math.ceil(this.settings.raidSize / this.settings.partySize);
        console.log(`\n🏗️ Creating ${numGroups} groups...`);
        this.initializeGroups(numGroups);

        // Step 4: Seed groups with cores
        console.log('\n🌱 Seeding groups with synergy cores...');
        this.seedGroups(cores);

        // Step 5: Fill remaining slots
        console.log('\n📦 Filling remaining group slots...');
        this.fillGroups();

        // Step 6: Distribute healers
        console.log('\n💚 Distributing healers across groups...');
        this.distributeHealers();

        // Step 7: Validate and finalize
        console.log('\n✅ Validating composition...');
        const raid = this.finalizeRaid();

        console.log('\n🎉 Optimization Complete!');
        this.printOptimizationSummary(raid);

        return raid;
    }

    /**
     * Build pairwise synergy matrix for all players
     */
    buildSynergyMatrix() {
        const n = this.players.length;
        this.synergyMatrix = Array(n).fill(null).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const synergy = this.synergyCalc.calculatePlayerSynergy(
                    this.players[i],
                    this.players[j]
                );
                this.synergyMatrix[i][j] = synergy;
                this.synergyMatrix[j][i] = synergy;
            }
        }

        console.log(`✅ Built ${n}x${n} synergy matrix`);
    }

    /**
     * Identify high-value synergy cores
     * Priority order:
     * 1. Tank + Shaman (score: 1000)
     * 2. Warlock + Shadow Priest (score: 240+)
     * 3. Mage + Balance Druid (score: 100+)
     * 4. Melee + Shaman (score: 50+)
     */
    identifySynergyCores() {
        const cores = [];
        const used = new Set();

        // Categorize players
        const tanks = this.players.filter(p => this.synergyCalc.isTank(p));
        const shamans = this.players.filter(p => this.synergyCalc.isShaman(p));
        const warlocks = this.players.filter(p => this.synergyCalc.isWarlock(p));
        const shadowPriests = this.players.filter(p => this.synergyCalc.isShadowPriest(p));
        const mages = this.players.filter(p => this.synergyCalc.isMage(p));
        const balanceDruids = this.players.filter(p => this.synergyCalc.isBalanceDruid(p));
        const melee = this.players.filter(p => 
            this.synergyCalc.isMelee(p) && !this.synergyCalc.isTank(p)
        );

        // Priority 1: Tank + Shaman (CRITICAL)
        // Allow multiple tanks with one shaman for tank-heavy groups
        for (const shaman of shamans) {
            if (used.has(shaman.id)) continue;
            
            // Find all available tanks for this shaman
            const availableTanks = tanks.filter(t => !used.has(t.id));
            
            if (availableTanks.length > 0) {
                // Create a tank-heavy core: up to 3 tanks + 1 shaman
                const coreTanks = availableTanks.slice(0, Math.min(3, availableTanks.length));
                const corePlayers = [shaman, ...coreTanks];
                
                cores.push({
                    players: corePlayers,
                    score: 1000 + (coreTanks.length - 1) * 100, // Bonus for multiple tanks
                    type: 'tank-shaman',
                    priority: 1
                });
                
                used.add(shaman.id);
                coreTanks.forEach(t => used.add(t.id));
                
                console.log(`  🛡️ Tank-Heavy+Shaman: ${coreTanks.map(t => t.name).join(' + ')} + ${shaman.name} (score: ${1000 + (coreTanks.length - 1) * 100})`);
            }
        }

        // Priority 2: Warlock + Shadow Priest
        for (const warlock of warlocks) {
            for (const spriest of shadowPriests) {
                if (!used.has(warlock.id) && !used.has(spriest.id)) {
                    const score = this.getSynergyScore(warlock, spriest);
                    cores.push({
                        players: [warlock, spriest],
                        score: score,
                        type: 'warlock-spriest',
                        priority: 2
                    });
                    used.add(warlock.id);
                    used.add(spriest.id);
                    console.log(`  🔮 Warlock+ShadowPriest: ${warlock.name} + ${spriest.name} (score: ${score})`);
                    break;
                }
            }
        }

        // Priority 3: Mage + Balance Druid
        for (const mage of mages) {
            for (const boomkin of balanceDruids) {
                if (!used.has(mage.id) && !used.has(boomkin.id)) {
                    const score = this.getSynergyScore(mage, boomkin);
                    cores.push({
                        players: [mage, boomkin],
                        score: score,
                        type: 'mage-boomkin',
                        priority: 3
                    });
                    used.add(mage.id);
                    used.add(boomkin.id);
                    console.log(`  ❄️ Mage+Boomkin: ${mage.name} + ${boomkin.name} (score: ${score})`);
                    break;
                }
            }
        }

        // Priority 4: Remaining Melee + Shaman
        for (const m of melee) {
            for (const shaman of shamans) {
                if (!used.has(m.id) && !used.has(shaman.id)) {
                    const score = this.getSynergyScore(m, shaman);
                    if (score >= 30) { // Only if significant synergy
                        cores.push({
                            players: [m, shaman],
                            score: score,
                            type: 'melee-shaman',
                            priority: 4
                        });
                        used.add(m.id);
                        used.add(shaman.id);
                        console.log(`  ⚔️ Melee+Shaman: ${m.name} + ${shaman.name} (score: ${score})`);
                        break;
                    }
                }
            }
        }

        // Sort cores by priority and score
        cores.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return b.score - a.score;
        });

        return cores;
    }

    /**
     * Get synergy score between two players from matrix
     */
    getSynergyScore(player1, player2) {
        const i = this.players.findIndex(p => p.id === player1.id);
        const j = this.players.findIndex(p => p.id === player2.id);
        return this.synergyMatrix[i][j];
    }

    /**
     * Initialize empty groups
     */
    initializeGroups(numGroups) {
        this.groups = [];
        for (let i = 0; i < numGroups; i++) {
            this.groups.push(new Group(i + 1));
        }
    }

    /**
     * Seed groups with synergy cores
     * Now allows multiple tanks per group if synergy supports it
     */
    seedGroups(cores) {
        let groupIndex = 0;

        for (const core of cores) {
            if (groupIndex >= this.groups.length) break;

            const group = this.groups[groupIndex];
            for (const player of core.players) {
                group.addPlayer(player);
            }

            console.log(`  ✅ Group ${group.id}: Added ${core.type} core (${core.players.map(p => p.name).join(' + ')})`);
            
            // For tank-shaman cores, check if we can add more tanks to this group
            if (core.type === 'tank-shaman') {
                // This group is now a tank-heavy group, will be filled with more tanks/melee in fillGroups
                group.groupType = 'tank-heavy';
            } else if (core.type === 'warlock-spriest') {
                group.groupType = 'warlock';
            } else if (core.type === 'mage-boomkin') {
                group.groupType = 'mage';
            }
            
            groupIndex++;
        }
    }

    /**
     * Fill remaining group slots with best synergy matches
     * Prioritizes filling Tank+Shaman groups with melee DPS first
     */
    fillGroups() {
        const assignedIds = new Set();
        this.groups.forEach(g => g.players.forEach(p => assignedIds.add(p.id)));

        const remainingPlayers = this.players.filter(p => !assignedIds.has(p.id));
        console.log(`  📊 Remaining players to assign: ${remainingPlayers.length}`);

        // Categorize remaining players with priority for rogues
        const warriors = remainingPlayers.filter(p => 
            p.class === 'Warrior' && !this.synergyCalc.isTank(p)
        );
        const rogues = remainingPlayers.filter(p => p.class === 'Rogue');
        const feralDruids = remainingPlayers.filter(p => this.synergyCalc.isFeralDruid(p));
        const enhancementShamans = remainingPlayers.filter(p => 
            p.class === 'Shaman' && p.spec && p.spec.includes('Enhancement')
        );
        
        // All melee DPS (for general melee groups)
        const allMelee = [...warriors, ...rogues, ...feralDruids, ...enhancementShamans];
        
        const hunters = remainingPlayers.filter(p => this.synergyCalc.isHunter(p));
        const casters = remainingPlayers.filter(p => this.synergyCalc.isCaster(p));
        const healers = remainingPlayers.filter(p => p.roles.primary === 'healer');
        const otherPlayers = remainingPlayers.filter(p => 
            !allMelee.includes(p) && !hunters.includes(p) && !casters.includes(p) && !healers.includes(p)
        );

        // Phase 1: Fill Tank+Shaman groups with melee DPS (PRIORITY: Warriors and Rogues)
        console.log(`  🎯 Phase 1: Filling Tank+Shaman groups with Warriors and Rogues`);
        const tankShamanGroups = this.groups.filter(g => {
            const hasTank = g.players.some(p => this.synergyCalc.isTank(p));
            const hasShaman = g.players.some(p => this.synergyCalc.isShaman(p));
            return hasTank && hasShaman && g.players.length < this.settings.partySize;
        });

        // Fill Tank+Shaman groups with Warriors and Rogues first (they benefit most from Windfury)
        for (const group of tankShamanGroups) {
            const slotsNeeded = this.settings.partySize - group.players.length;
            
            // Priority order: Warriors > Rogues > Feral Druids > Enhancement Shamans
            const meleeByPriority = [
                ...warriors.filter(w => !assignedIds.has(w.id)),
                ...rogues.filter(r => !assignedIds.has(r.id)),
                ...feralDruids.filter(f => !assignedIds.has(f.id)),
                ...enhancementShamans.filter(e => !assignedIds.has(e.id))
            ];
            
            let meleeAdded = 0;
            for (let i = 0; i < Math.min(slotsNeeded, 3) && meleeByPriority.length > 0; i++) {
                // Find best melee for this group from priority list
                let bestMelee = null;
                let bestScore = -Infinity;
                
                for (const m of meleeByPriority) {
                    if (assignedIds.has(m.id)) continue;
                    const score = this.calculateIncrementalSynergy(group, m);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMelee = m;
                    }
                }
                
                if (bestMelee) {
                    group.addPlayer(bestMelee);
                    assignedIds.add(bestMelee.id);
                    meleeAdded++;
                    console.log(`  ➕ Group ${group.id}: Added ${bestMelee.name} (${bestMelee.class} ${bestMelee.spec}) [Melee] - Synergy: ${bestScore.toFixed(0)}`);
                    
                    // Remove from priority list
                    const index = meleeByPriority.findIndex(m => m.id === bestMelee.id);
                    if (index > -1) meleeByPriority.splice(index, 1);
                }
            }
            
            // If we have room and added 2+ melee, consider adding a hunter for Trueshot Aura
            if (group.players.length < this.settings.partySize && meleeAdded >= 2 && hunters.length > 0) {
                let bestHunter = null;
                let bestScore = -Infinity;
                
                for (const h of hunters) {
                    if (assignedIds.has(h.id)) continue;
                    const score = this.calculateIncrementalSynergy(group, h);
                    if (score > bestScore) {
                        bestScore = score;
                        bestHunter = h;
                    }
                }
                
                if (bestHunter) {
                    group.addPlayer(bestHunter);
                    assignedIds.add(bestHunter.id);
                    console.log(`  ➕ Group ${group.id}: Added ${bestHunter.name} (Hunter) [Trueshot Aura] - Synergy: ${bestScore.toFixed(0)}`);
                }
            }
        }
        
        // Phase 1b: Create additional melee groups if we have leftover Warriors/Rogues and Shamans
        console.log(`  🎯 Phase 1b: Creating additional melee groups`);
        const unassignedMelee = allMelee.filter(m => !assignedIds.has(m.id));
        const unassignedShamans = remainingPlayers.filter(p => 
            this.synergyCalc.isShaman(p) && !assignedIds.has(p.id)
        );
        
        if (unassignedMelee.length >= 3 && unassignedShamans.length > 0) {
            // Find an empty group
            const emptyGroup = this.groups.find(g => g.players.length === 0);
            if (emptyGroup) {
                // Add shaman first
                const shaman = unassignedShamans[0];
                emptyGroup.addPlayer(shaman);
                assignedIds.add(shaman.id);
                console.log(`  ➕ Group ${emptyGroup.id}: Added ${shaman.name} (Shaman) [New Melee Group]`);
                
                // Add up to 4 melee
                for (let i = 0; i < Math.min(4, unassignedMelee.length); i++) {
                    const melee = unassignedMelee[i];
                    if (!assignedIds.has(melee.id)) {
                        emptyGroup.addPlayer(melee);
                        assignedIds.add(melee.id);
                        console.log(`  ➕ Group ${emptyGroup.id}: Added ${melee.name} (${melee.class}) [Melee]`);
                    }
                }
                
                emptyGroup.groupType = 'melee';
            }
        }

        // Phase 2: Fill specialized groups (Warlock, Mage) with their class members
        console.log(`  🎯 Phase 2: Filling specialized caster groups`);
        const warlockGroups = this.groups.filter(g => {
            const warlockCount = g.players.filter(p => this.synergyCalc.isWarlock(p)).length;
            return warlockCount >= 1 && g.players.length < this.settings.partySize;
        });
        
        const mageGroups = this.groups.filter(g => {
            const mageCount = g.players.filter(p => this.synergyCalc.isMage(p)).length;
            return mageCount >= 1 && g.players.length < this.settings.partySize;
        });

        // Fill warlock groups with more warlocks
        for (const group of warlockGroups) {
            while (group.players.length < this.settings.partySize) {
                const availableWarlocks = casters.filter(p => 
                    this.synergyCalc.isWarlock(p) && !assignedIds.has(p.id)
                );
                
                if (availableWarlocks.length === 0) break;
                
                let bestWarlock = null;
                let bestScore = -Infinity;
                
                for (const w of availableWarlocks) {
                    const score = this.calculateIncrementalSynergy(group, w);
                    if (score > bestScore) {
                        bestScore = score;
                        bestWarlock = w;
                    }
                }
                
                if (bestWarlock) {
                    group.addPlayer(bestWarlock);
                    assignedIds.add(bestWarlock.id);
                    console.log(`  ➕ Group ${group.id}: Added ${bestWarlock.name} (Warlock) - Synergy: ${bestScore.toFixed(0)}`);
                } else {
                    break;
                }
            }
        }

        // Fill mage groups with more mages
        for (const group of mageGroups) {
            while (group.players.length < this.settings.partySize) {
                const availableMages = casters.filter(p => 
                    this.synergyCalc.isMage(p) && !assignedIds.has(p.id)
                );
                
                if (availableMages.length === 0) break;
                
                let bestMage = null;
                let bestScore = -Infinity;
                
                for (const m of availableMages) {
                    const score = this.calculateIncrementalSynergy(group, m);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMage = m;
                    }
                }
                
                if (bestMage) {
                    group.addPlayer(bestMage);
                    assignedIds.add(bestMage.id);
                    console.log(`  ➕ Group ${group.id}: Added ${bestMage.name} (Mage) - Synergy: ${bestScore.toFixed(0)}`);
                } else {
                    break;
                }
            }
        }

        // Phase 3: Fill remaining slots with best synergy matches
        console.log(`  🎯 Phase 3: Filling remaining slots with best synergy`);
        const allRemaining = this.players.filter(p => !assignedIds.has(p.id));
        
        // Sort by priority
        allRemaining.sort((a, b) => {
            const priorityA = this.getPlayerPriority(a);
            const priorityB = this.getPlayerPriority(b);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return b.gearScore - a.gearScore;
        });

        for (const player of allRemaining) {
            let bestGroup = null;
            let bestScore = -Infinity;

            for (const group of this.groups) {
                if (group.players.length >= this.settings.partySize) continue;

                const score = this.calculateIncrementalSynergy(group, player);
                if (score > bestScore) {
                    bestScore = score;
                    bestGroup = group;
                }
            }

            if (bestGroup) {
                bestGroup.addPlayer(player);
                assignedIds.add(player.id);
                console.log(`  ➕ Group ${bestGroup.id}: Added ${player.name} (${player.class} ${player.spec}) - Synergy: ${bestScore.toFixed(0)}`);
            } else {
                console.log(`  ⚠️ Could not place ${player.name} - all groups full`);
            }
        }
    }

    /**
     * Calculate synergy gain from adding player to group
     */
    calculateIncrementalSynergy(group, player) {
        let synergy = 0;

        // Calculate synergy with each existing group member
        for (const member of group.players) {
            synergy += this.getSynergyScore(player, member);
        }

        // Add role balance bonus
        const counts = this.synergyCalc.countPlayerTypes(group.players);
        
        // Bonus for adding needed roles
        if (this.synergyCalc.isTank(player) && counts.tanks === 0) {
            synergy += 50;
        }
        if (player.roles.primary === 'healer' && counts.healers === 0) {
            synergy += 40;
        }

        // Penalty for role oversaturation
        if (player.roles.primary === 'healer' && counts.healers >= 2) {
            synergy -= 30;
        }
        if (this.synergyCalc.isTank(player) && counts.tanks >= 2) {
            synergy -= 40;
        }

        // Special bonuses for optimal compositions
        const hasTank = counts.tanks > 0;
        const hasShaman = counts.shamans > 0;
        
        // Tank+Shaman group: prioritize melee DPS
        if (hasTank && hasShaman) {
            const isMelee = this.synergyCalc.isMelee(player) && !this.synergyCalc.isTank(player);
            const isHunter = this.synergyCalc.isHunter(player);
            
            if (isMelee) {
                // Strong bonus for adding melee to Tank+Shaman groups
                synergy += 50;
                
                // Extra bonus if we already have 2+ melee (building a strong melee core)
                if (counts.melee >= 2) {
                    synergy += 25;
                }
            } else if (isHunter && counts.melee >= 2) {
                // Bonus for adding hunter to melee-heavy groups (Trueshot Aura)
                synergy += 30;
            } else if (!isMelee && !isHunter && player.roles.primary !== 'healer') {
                // Penalty for adding non-melee DPS to Tank+Shaman groups
                synergy -= 40;
            }
        }
        
        // Warlock group: prioritize more warlocks
        if (counts.warlocks >= 2) {
            if (this.synergyCalc.isWarlock(player)) {
                synergy += 40; // Strong bonus for adding more warlocks
            } else if (!this.synergyCalc.isShadowPriest(player) && player.roles.primary !== 'healer') {
                synergy -= 20; // Penalty for diluting warlock group
            }
        }
        
        // Mage group: prioritize more mages
        if (counts.mages >= 2) {
            if (this.synergyCalc.isMage(player)) {
                synergy += 40; // Strong bonus for adding more mages
            } else if (!this.synergyCalc.isBalanceDruid(player) && player.roles.primary !== 'healer') {
                synergy -= 20; // Penalty for diluting mage group
            }
        }

        return synergy;
    }

    /**
     * Get player priority for assignment order
     * Lower number = higher priority
     */
    getPlayerPriority(player) {
        if (this.synergyCalc.isTank(player)) return 1;
        if (player.roles.primary === 'healer') return 2;
        if (this.synergyCalc.isShaman(player)) return 3;
        if (this.synergyCalc.isShadowPriest(player)) return 4;
        if (this.synergyCalc.isBalanceDruid(player)) return 5;
        return 6; // Regular DPS
    }

    /**
     * Distribute healers evenly across groups
     */
    distributeHealers() {
        // Count healers per group
        const healerCounts = this.groups.map(g => ({
            group: g,
            healers: g.players.filter(p => p.roles.primary === 'healer').length
        }));

        // Sort by healer count (descending)
        healerCounts.sort((a, b) => b.healers - a.healers);

        // Move healers from healer-heavy groups to groups without healers
        for (const source of healerCounts) {
            if (source.healers <= 1) break; // Don't take from groups with 1 or fewer healers

            for (const target of healerCounts) {
                if (target.healers >= 1) continue; // Skip groups that already have healers
                if (target.group.players.length >= this.settings.partySize) continue;

                // Find a healer to move (prefer non-Shamans)
                const healerToMove = source.group.players.find(p => 
                    p.roles.primary === 'healer' && !this.synergyCalc.isShaman(p)
                );

                if (healerToMove) {
                    source.group.removePlayer(healerToMove.id);
                    target.group.addPlayer(healerToMove);
                    source.healers--;
                    target.healers++;
                    console.log(`  🔄 Moved healer ${healerToMove.name} from Group ${source.group.id} to Group ${target.group.id}`);
                }
            }
        }
    }

    /**
     * Finalize raid and calculate statistics
     */
    finalizeRaid() {
        const raid = new Raid(this.settings.raidSize, this.settings.faction);

        // Add all players from groups to raid
        for (const group of this.groups) {
            // Calculate group synergy
            group.synergyScore = this.synergyCalc.calculateGroupSynergy(group.players);
            
            // Add players to raid
            for (const player of group.players) {
                raid.addPlayer(player);
            }
        }

        // Set groups
        raid.groups = this.groups;

        return raid;
    }

    /**
     * Print optimization summary
     */
    printOptimizationSummary(raid) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 OPTIMIZATION SUMMARY');
        console.log('='.repeat(60));

        const stats = raid.getCompositionStats();
        console.log(`\n👥 Total Players: ${stats.totalPlayers}`);
        console.log(`🏰 Groups: ${this.groups.length}`);
        console.log(`🛡️ Tanks: ${stats.tanks}`);
        console.log(`💚 Healers: ${stats.healers}`);
        console.log(`⚔️ DPS: ${stats.dps}`);
        console.log(`📈 Average Gear Score: ${stats.averageGearScore.toFixed(1)}`);

        console.log('\n🎯 Group Synergy Scores:');
        let totalSynergy = 0;
        for (const group of this.groups) {
            console.log(`  Group ${group.id}: ${group.synergyScore} (${group.players.length} players)`);
            totalSynergy += group.synergyScore;
        }
        console.log(`  Total Raid Synergy: ${totalSynergy}`);
        console.log(`  Average Group Synergy: ${(totalSynergy / this.groups.length).toFixed(1)}`);

        console.log('\n' + '='.repeat(60));
    }
}

module.exports = GlobalOptimizer;