// Test script for synergy-based grouping
const RaidHelperParser = require('./src/core/parser');
const RaidOptimizer = require('./src/core/optimizer');
const fs = require('fs');

console.log('🧪 Testing Synergy-Based Raid Composition\n');

// Load the example raid data
const raidData = JSON.parse(fs.readFileSync('./sample-data/raid-example-1.json', 'utf-8'));

// Parse the data
const parser = new RaidHelperParser();
const parseResult = parser.parse(raidData);

console.log(`✅ Parsed ${parseResult.players.length} valid players\n`);

// Create optimizer with settings
const optimizer = new RaidOptimizer({
    raidSize: 40,
    faction: 'neutral',
    healerPercentage: 25,
    minTanks: 2
});

// Optimize the composition
console.log('🎯 Optimizing with synergy-based grouping...\n');
const result = optimizer.optimize(parseResult.players);

console.log(`✅ Created ${result.groups.length} groups\n`);

// Display each group with synergy information
result.groups.forEach((group, index) => {
    console.log(`═══════════════════════════════════════════`);
    console.log(`GROUP ${group.id} (Synergy Score: ${group.score})`);
    console.log(`═══════════════════════════════════════════`);
    
    const comp = group.getComposition();
    console.log(`Composition: ${comp.tank} Tank, ${comp.healer} Healer, ${comp.dps} DPS\n`);
    
    group.players.forEach(player => {
        const roleIcon = player.roles.primary === 'tank' ? '🛡️' :
                        player.roles.primary === 'healer' ? '💚' : '⚔️';
        console.log(`  ${roleIcon} ${player.name.padEnd(20)} | ${player.class.padEnd(10)} | ${player.spec}`);
    });
    
    console.log(`\nBuffs: ${Array.from(group.buffs).join(', ')}`);
    console.log('');
});

// Show composition statistics
console.log('═══════════════════════════════════════════');
console.log('COMPOSITION STATISTICS');
console.log('═══════════════════════════════════════════');
console.log(`Total Players: ${result.selectedPlayers.length}`);
console.log(`Tanks: ${result.raid.composition.tanks}`);
console.log(`Healers: ${result.raid.composition.healers}`);
console.log(`DPS: ${result.raid.composition.dps}`);
console.log(`Average Group Score: ${Math.round(result.statistics.averageGroupScore)}`);
console.log(`Total Unique Buffs: ${result.statistics.buffCoverage.length}`);
console.log('');

// Show class distribution
console.log('Class Distribution:');
Object.entries(result.statistics.classDistribution).forEach(([className, count]) => {
    console.log(`  ${className}: ${count}`);
});

console.log('\n🎉 Synergy-based optimization complete!\n');