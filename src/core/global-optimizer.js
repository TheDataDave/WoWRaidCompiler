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
        for (const tank of tanks) {
            for (const shaman of shamans) {
                if (!used.has(tank.id) && !used.has(shaman.id)) {
                    cores.push({
                        players: [tank, shaman],
                        score: 1000,
                        type: 'tank-shaman',
                        priority: 1
                    });
                    used.add(tank.id);
                    used.add(shaman.id);
                    console.log(`  🛡️ Tank+Shaman: ${tank.name} + ${shaman.name} (score: 1000)`);
                    break;
                }
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
            groupIndex++;
        }
    }

    /**
     * Fill remaining group slots with best synergy matches
     */
    fillGroups() {
        const assignedIds = new Set();
        this.groups.forEach(g => g.players.forEach(p => assignedIds.add(p.id)));

        const remainingPlayers = this.players.filter(p => !assignedIds.has(p.id));
        console.log(`  📊 Remaining players to assign: ${remainingPlayers.length}`);

        // Sort remaining players by priority (tanks > healers > DPS)
        remainingPlayers.sort((a, b) => {
            const priorityA = this.getPlayerPriority(a);
            const priorityB = this.getPlayerPriority(b);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return b.gearScore - a.gearScore; // Higher GS first
        });

        // Greedy assignment: place each player in group with best synergy gain
        for (const player of remainingPlayers) {
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
                console.log(`  ➕ Group ${bestGroup.id}: Added ${player.name} (${player.class} ${player.spec}) - Synergy gain: ${bestScore.toFixed(0)}`);
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