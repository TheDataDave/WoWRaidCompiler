const { Player, Raid, Group } = require('./models');

class RaidOptimizer {
    constructor(settings) {
        this.settings = {
            raidSize: settings.raidSize || 40,
            faction: settings.faction || 'neutral',
            healerPercentage: settings.healerPercentage || 25,
            minTanks: settings.minTanks || 2,
            classWeights: settings.classWeights || this.getDefaultClassWeights(),
            partySize: 5
        };
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

        // Distribute players to maximize synergy
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

        // First, distribute key roles (tanks and healers) evenly
        const tanks = sortedPlayers.filter(p => p.roles.primary === 'tank');
        const healers = sortedPlayers.filter(p => p.roles.primary === 'healer');
        const dps = sortedPlayers.filter(p => 
            p.roles.primary === 'dps' && !tanks.includes(p) && !healers.includes(p)
        );

        // Distribute tanks
        tanks.forEach((tank, index) => {
            const groupIndex = index % numGroups;
            groups[groupIndex].addPlayer(tank);
        });

        // Distribute healers
        healers.forEach((healer, index) => {
            const groupIndex = index % numGroups;
            groups[groupIndex].addPlayer(healer);
        });

        // Distribute DPS to balance groups
        dps.forEach(player => {
            // Find group with lowest player count
            const targetGroup = groups.reduce((min, group) => 
                group.players.length < min.players.length ? group : min
            );
            targetGroup.addPlayer(player);
        });

        // Calculate scores for all groups
        groups.forEach(group => group.calculateScore());

        return groups;
    }

    optimize(players) {
        // Select best players for raid
        const selectedPlayers = this.selectPlayers(players);

        // Create optimized groups
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