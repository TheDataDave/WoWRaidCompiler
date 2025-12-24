const { Player } = require('./src/core/models');
const RaidOptimizer = require('./src/core/optimizer');

console.log('🧪 Testing Global Optimization Algorithm\n');
console.log('='.repeat(60));

// Create test players
function createTestPlayer(id, name, playerClass, spec, role, gearScore = 200) {
    const player = new Player({
        userid: id,
        name: name,
        class: playerClass,
        spec: spec,
        gearScore: gearScore,
        isConfirmed: true
    });
    player.roles = { primary: role, secondary: null };
    return player;
}

// Test Scenario 1: Optimal 40-man composition
console.log('\n📊 TEST SCENARIO 1: Optimal 40-Man Composition');
console.log('-'.repeat(60));

const testPlayers = [
    // Tanks
    createTestPlayer('t1', 'Tank1', 'Warrior', 'Protection', 'tank', 250),
    createTestPlayer('t2', 'Tank2', 'Warrior', 'Protection', 'tank', 245),
    createTestPlayer('t3', 'Tank3', 'Warrior', 'Protection', 'tank', 240),
    
    // Melee Warriors
    createTestPlayer('w1', 'Warrior1', 'Warrior', 'Fury', 'dps', 230),
    createTestPlayer('w2', 'Warrior2', 'Warrior', 'Fury', 'dps', 225),
    createTestPlayer('w3', 'Warrior3', 'Warrior', 'Fury', 'dps', 220),
    createTestPlayer('w4', 'Warrior4', 'Warrior', 'Arms', 'dps', 215),
    createTestPlayer('w5', 'Warrior5', 'Warrior', 'Fury', 'dps', 210),
    
    // Rogues
    createTestPlayer('r1', 'Rogue1', 'Rogue', 'Combat', 'dps', 220),
    createTestPlayer('r2', 'Rogue2', 'Rogue', 'Combat', 'dps', 215),
    createTestPlayer('r3', 'Rogue3', 'Rogue', 'Assassination', 'dps', 210),
    
    // Shamans (Restoration)
    createTestPlayer('sh1', 'Shaman1', 'Shaman', 'Restoration', 'healer', 230),
    createTestPlayer('sh2', 'Shaman2', 'Shaman', 'Restoration', 'healer', 225),
    createTestPlayer('sh3', 'Shaman3', 'Shaman', 'Restoration', 'healer', 220),
    
    // Warlocks
    createTestPlayer('wl1', 'Warlock1', 'Warlock', 'Destruction', 'dps', 225),
    createTestPlayer('wl2', 'Warlock2', 'Warlock', 'Destruction', 'dps', 220),
    createTestPlayer('wl3', 'Warlock3', 'Warlock', 'Affliction', 'dps', 215),
    createTestPlayer('wl4', 'Warlock4', 'Warlock', 'Destruction', 'dps', 210),
    
    // Shadow Priest
    createTestPlayer('sp1', 'ShadowPriest1', 'Priest', 'Shadow', 'dps', 220),
    
    // Mages
    createTestPlayer('m1', 'Mage1', 'Mage', 'Fire', 'dps', 225),
    createTestPlayer('m2', 'Mage2', 'Mage', 'Fire', 'dps', 220),
    createTestPlayer('m3', 'Mage3', 'Mage', 'Frost', 'dps', 215),
    createTestPlayer('m4', 'Mage4', 'Mage', 'Arcane', 'dps', 210),
    
    // Balance Druid
    createTestPlayer('bd1', 'Boomkin1', 'Druid', 'Balance', 'dps', 215),
    
    // Hunters
    createTestPlayer('h1', 'Hunter1', 'Hunter', 'Marksmanship', 'dps', 220),
    createTestPlayer('h2', 'Hunter2', 'Hunter', 'Beast Mastery', 'dps', 215),
    createTestPlayer('h3', 'Hunter3', 'Hunter', 'Marksmanship', 'dps', 210),
    
    // Other Healers
    createTestPlayer('p1', 'Priest1', 'Priest', 'Holy', 'healer', 230),
    createTestPlayer('p2', 'Priest2', 'Priest', 'Holy', 'healer', 225),
    createTestPlayer('p3', 'Priest3', 'Priest', 'Discipline', 'healer', 220),
    createTestPlayer('p4', 'Priest4', 'Priest', 'Holy', 'healer', 215),
    createTestPlayer('d1', 'Druid1', 'Druid', 'Restoration', 'healer', 220),
    createTestPlayer('d2', 'Druid2', 'Druid', 'Restoration', 'healer', 215),
    createTestPlayer('pal1', 'Paladin1', 'Paladin', 'Holy', 'healer', 225),
    createTestPlayer('pal2', 'Paladin2', 'Paladin', 'Holy', 'healer', 220),
    
    // Feral Druid
    createTestPlayer('fd1', 'FeralDruid1', 'Druid', 'Feral', 'dps', 215),
    
    // Enhancement Shaman
    createTestPlayer('esh1', 'EnhShaman1', 'Shaman', 'Enhancement', 'dps', 210),
];

console.log(`\n✅ Created ${testPlayers.length} test players`);
console.log(`   Tanks: ${testPlayers.filter(p => p.roles.primary === 'tank').length}`);
console.log(`   Healers: ${testPlayers.filter(p => p.roles.primary === 'healer').length}`);
console.log(`   DPS: ${testPlayers.filter(p => p.roles.primary === 'dps').length}`);

// Test Global Optimization
console.log('\n🌍 Running GLOBAL OPTIMIZATION...');
console.log('='.repeat(60));

const globalSettings = {
    raidSize: 40,
    faction: 'horde',
    healerPercentage: 25,
    minTanks: 2,
    optimizationMode: 'global'
};

const globalOptimizer = new RaidOptimizer(globalSettings);
const globalResult = globalOptimizer.optimize(testPlayers, 'global');

console.log('\n📊 GLOBAL OPTIMIZATION RESULTS:');
console.log('='.repeat(60));
console.log(`Total Players Selected: ${globalResult.selectedPlayers.length}`);
console.log(`Total Groups: ${globalResult.groups.length}`);
console.log(`Average Group Synergy: ${globalResult.statistics.averageGroupScore}`);

console.log('\n🎯 Group Breakdown:');
globalResult.groups.forEach((group, index) => {
    console.log(`\nGroup ${group.id}:`);
    console.log(`  Synergy Score: ${group.score || group.synergyScore || 0}`);
    console.log(`  Players (${group.players.length}):`);
    group.players.forEach(p => {
        console.log(`    - ${p.name} (${p.class} ${p.spec}) [${p.roles.primary}] GS: ${p.gearScore}`);
    });
    
    // Check for synergy cores
    const hasTank = group.players.some(p => p.roles.primary === 'tank');
    const hasShaman = group.players.some(p => p.class === 'Shaman');
    const hasWarlock = group.players.filter(p => p.class === 'Warlock').length;
    const hasShadowPriest = group.players.some(p => p.class === 'Priest' && p.spec === 'Shadow');
    const hasMage = group.players.filter(p => p.class === 'Mage').length;
    const hasBalanceDruid = group.players.some(p => p.class === 'Druid' && p.spec === 'Balance');
    
    if (hasTank && hasShaman) {
        console.log(`  ✅ SYNERGY CORE: Tank + Shaman (Windfury!)`);
    }
    if (hasWarlock >= 3 && hasShadowPriest) {
        console.log(`  ✅ SYNERGY CORE: Warlocks + Shadow Priest (Shadow Weaving!)`);
    }
    if (hasMage >= 3 && hasBalanceDruid) {
        console.log(`  ✅ SYNERGY CORE: Mages + Balance Druid (Moonkin Aura!)`);
    }
});

// Test Legacy Optimization for comparison
console.log('\n\n📊 Running LEGACY OPTIMIZATION (for comparison)...');
console.log('='.repeat(60));

const legacySettings = {
    raidSize: 40,
    faction: 'horde',
    healerPercentage: 25,
    minTanks: 2,
    optimizationMode: 'keep-groups'
};

const legacyOptimizer = new RaidOptimizer(legacySettings);
const legacyResult = legacyOptimizer.optimize(testPlayers, 'keep-groups');

console.log('\n📊 LEGACY OPTIMIZATION RESULTS:');
console.log('='.repeat(60));
console.log(`Total Players Selected: ${legacyResult.selectedPlayers.length}`);
console.log(`Total Groups: ${legacyResult.groups.length}`);
console.log(`Average Group Synergy: ${legacyResult.statistics.averageGroupScore}`);

// Comparison
console.log('\n\n📈 COMPARISON: Global vs Legacy');
console.log('='.repeat(60));
console.log(`Global Average Synergy: ${globalResult.statistics.averageGroupScore}`);
console.log(`Legacy Average Synergy: ${legacyResult.statistics.averageGroupScore}`);
const improvement = globalResult.statistics.averageGroupScore - legacyResult.statistics.averageGroupScore;
const improvementPct = ((improvement / legacyResult.statistics.averageGroupScore) * 100).toFixed(1);
console.log(`Improvement: ${improvement.toFixed(0)} points (${improvementPct}%)`);

// Calculate total raid synergy
const globalTotalSynergy = globalResult.groups.reduce((sum, g) => sum + (g.score || g.synergyScore || 0), 0);
const legacyTotalSynergy = legacyResult.groups.reduce((sum, g) => sum + (g.score || g.synergyScore || 0), 0);
console.log(`\nGlobal Total Raid Synergy: ${globalTotalSynergy}`);
console.log(`Legacy Total Raid Synergy: ${legacyTotalSynergy}`);
console.log(`Total Improvement: ${globalTotalSynergy - legacyTotalSynergy} points`);

console.log('\n✅ Testing Complete!');
console.log('='.repeat(60));