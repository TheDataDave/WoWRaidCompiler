const { Player } = require('./models');

class RaidHelperParser {
    constructor() {
        this.requiredFields = ['class', 'spec', 'name'];
    }

    validate(data) {
        const errors = [];

        if (!data) {
            errors.push('No data provided');
            return { valid: false, errors };
        }

        // Check if raidDrop exists
        if (!data.raidDrop || !Array.isArray(data.raidDrop)) {
            errors.push('Missing or invalid raidDrop array');
            return { valid: false, errors };
        }

        // Validate each player entry
        data.raidDrop.forEach((entry, index) => {
            this.requiredFields.forEach(field => {
                if (!entry[field]) {
                    errors.push(`Player ${index + 1}: Missing required field '${field}'`);
                }
            });
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    parse(data) {
        const validation = this.validate(data);
        
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors,
                players: []
            };
        }

        const players = [];
        const warnings = [];

        data.raidDrop.forEach((entry, index) => {
            try {
                const player = new Player({
                    userid: entry.userid,
                    name: entry.name,
                    class: entry.class,
                    spec: entry.spec || entry.spec1,
                    signuptime: entry.signuptime,
                    isConfirmed: entry.isConfirmed !== false,
                    note: entry.note,
                    partyId: entry.partyId,
                    slotId: entry.slotId
                });

                players.push(player);
            } catch (error) {
                warnings.push(`Player ${index + 1} (${entry.name}): ${error.message}`);
            }
        });

        return {
            success: true,
            players,
            warnings,
            metadata: {
                totalSignups: data.raidDrop.length,
                partyPerRaid: data.partyPerRaid,
                slotPerParty: data.slotPerParty,
                raidId: data._id
            }
        };
    }

    getSummary(players) {
        const summary = {
            total: players.length,
            confirmed: 0,
            tentative: 0,
            benched: 0,
            byClass: {},
            byRole: {
                tank: 0,
                healer: 0,
                dps: 0
            }
        };

        players.forEach(player => {
            // Count status
            if (player.isConfirmed) summary.confirmed++;
            if (player.isTentative) summary.tentative++;
            if (player.isBenched) summary.benched++;

            // Count by class
            summary.byClass[player.class] = (summary.byClass[player.class] || 0) + 1;

            // Count by role
            summary.byRole[player.roles.primary]++;
        });

        return summary;
    }

    exportToJSON(raid, groups) {
        return {
            metadata: {
                exportDate: new Date().toISOString(),
                raidSize: raid.size,
                faction: raid.faction,
                totalPlayers: raid.players.length
            },
            composition: raid.composition,
            groups: groups.map(group => group.toJSON()),
            players: raid.players.map(player => player.toJSON())
        };
    }

    exportToCSV(raid, groups) {
        const headers = [
            'Group',
            'Player Name',
            'Class',
            'Spec',
            'Role',
            'Gear Score',
            'Score',
            'Status'
        ];

        const rows = [headers.join(',')];

        groups.forEach(group => {
            group.players.forEach(player => {
                const status = player.isConfirmed ? 'Confirmed' : 
                              player.isTentative ? 'Tentative' : 'Signed Up';
                
                const row = [
                    group.id,
                    `"${player.name}"`,
                    player.class,
                    `"${player.spec}"`,
                    player.roles.primary,
                    player.gearScore,
                    player.score,
                    status
                ];
                rows.push(row.join(','));
            });
        });

        return rows.join('\n');
    }

    exportToText(raid, groups) {
        let text = '═══════════════════════════════════════════════════════\n';
        text += '       WOW CLASSIC RAID COMPOSITION\n';
        text += '═══════════════════════════════════════════════════════\n\n';

        text += `Raid Size: ${raid.size}\n`;
        text += `Faction: ${raid.faction}\n`;
        text += `Total Players: ${raid.players.length}\n\n`;

        text += 'COMPOSITION:\n';
        text += `  Tanks: ${raid.composition.tanks}\n`;
        text += `  Healers: ${raid.composition.healers}\n`;
        text += `  DPS: ${raid.composition.dps}\n`;
        text += `  Utility: ${raid.composition.utility}\n\n`;

        text += '───────────────────────────────────────────────────────\n\n';

        groups.forEach(group => {
            text += `GROUP ${group.id} (Score: ${group.score})\n`;
            text += '───────────────────────────────────────────────────────\n';
            
            group.players.forEach(player => {
                const roleIcon = player.roles.primary === 'tank' ? '🛡️' :
                               player.roles.primary === 'healer' ? '💚' : '⚔️';
                text += `${roleIcon} ${player.name.padEnd(20)} | ${player.class.padEnd(10)} | `;
                text += `${player.spec.padEnd(15)} | GS: ${player.gearScore}\n`;
            });
            
            text += '\n';
        });

        text += '═══════════════════════════════════════════════════════\n';
        
        return text;
    }
}

module.exports = RaidHelperParser;