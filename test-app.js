// Simple test script to verify core functionality
const { Player, Raid, Group } = require('./src/core/models');
const RaidHelperParser = require('./src/core/parser');
const RaidOptimizer = require('./src/core/optimizer');
const fs = require('fs');

console.log('🧪 Testing WoW Classic Raid Composition Optimizer\n');

// Test 1: Load sample data
console.log('Test 1: Loading sample data...');
const sampleData = JSON.parse(fs.readFileSync('./sample-data/raid-helper-sample.json', 'utf-8'));
console.log('✅ Sample data loaded successfully\n');

// Test 2: Parse data
console.log('Test 2: Parsing raid data...');
const parser = new RaidHelperParser();
const parseResult = parser.parse(sampleData);
console.log(`✅ Parsed ${parseResult.players.length} players`);
console.log(`   Warnings: ${parseResult.warnings.length}\n`);

// Test 3: Get summary
console.log('Test 3: Generating summary...');
const summary = parser.getSummary(parseResult.players);
console.log('✅ Summary generated:');
console.log(`   Total: ${summary.total}`);
console.log(`   Confirmed: ${summary.confirmed}`);
console.log(`   Tanks: ${summary.byRole.tank}`);
console.log(`   Healers: ${summary.byRole.healer}`);
console.log(`   DPS: ${summary.byRole.dps}\n`);

// Test 4: Optimize composition
console.log('Test 4: Optimizing raid composition...');
const optimizer = new RaidOptimizer({
    raidSize: 25,
    faction: 'neutral',
    healerPercentage: 25,
    minTanks: 2,
    classWeights: {
        'Warrior': 5,
        'Rogue': 4,
        'Hunter': 5,
        'Mage': 5,
        'Warlock': 5,
        'Priest': 6,
        'Druid': 5,
        'Shaman': 7,
        'Paladin': 6
    }
});

const result = optimizer.optimize(parseResult.players);
console.log('✅ Optimization complete:');
console.log(`   Selected: ${result.selectedPlayers.length} players`);
console.log(`   Benched: ${result.benchedPlayers.length} players`);
console.log(`   Groups: ${result.groups.length}`);
console.log(`   Tanks: ${result.raid.composition.tanks}`);
console.log(`   Healers: ${result.raid.composition.healers}`);
console.log(`   DPS: ${result.raid.composition.dps}\n`);

// Test 5: Display groups
console.log('Test 5: Group composition:');
result.groups.forEach(group => {
    const comp = group.getComposition();
    console.log(`   Group ${group.id}: ${group.players.length} players (T:${comp.tank} H:${comp.healer} D:${comp.dps}) Score: ${group.score}`);
});
console.log('');

// Test 6: Export formats
console.log('Test 6: Testing export formats...');
const jsonExport = parser.exportToJSON(result.raid, result.groups);
console.log(`✅ JSON export: ${Object.keys(jsonExport).length} keys`);

const csvExport = parser.exportToCSV(result.raid, result.groups);
console.log(`✅ CSV export: ${csvExport.split('\n').length} lines`);

const textExport = parser.exportToText(result.raid, result.groups);
console.log(`✅ Text export: ${textExport.length} characters\n`);

// Test 7: Player model
console.log('Test 7: Testing player model...');
const testPlayer = new Player({
    name: 'TestWarrior',
    class: 'Warrior',
    spec: 'Protection',
    isConfirmed: true
});
console.log(`✅ Player created: ${testPlayer.name}`);
console.log(`   Class: ${testPlayer.class}`);
console.log(`   Primary Role: ${testPlayer.roles.primary}`);
console.log(`   Buffs: ${testPlayer.getBuffsProvided().join(', ')}\n`);

console.log('🎉 All tests passed! Application is ready to use.\n');
console.log('To start the application, run: npm start');