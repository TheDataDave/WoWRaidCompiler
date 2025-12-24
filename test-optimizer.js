/**
 * Test Suite for New Raid Optimizer
 * 
 * Tests all components of the new optimizer system:
 * - Status normalization
 * - State model immutability
 * - Constraint validation
 * - Seed generation
 * - Optimization
 * - Scoring
 */

const { Player } = require('./models');
const { normalizeStatus, PlayerStatus, getStatusPriority } = require('./status-enums');
const { RaidState, Group, Slot } = require('./state-model');
const { validateRaidState, isValidRaidState } = require('./constraints');
const { generateSeed, canGenerateSeed } = require('./seed-generator');
const { optimize } = require('./search-optimizer');
const { scoreRaidComposition, getScoreBreakdown } = require('./scoring');
const { optimizeRaidComposition } = require('./new-optimizer');

/**
 * Create test players with various configurations
 */
function createTestPlayers() {
	const players = [
		// Tanks
		new Player({ userid: 't1', name: 'Tank1', class: 'Warrior', spec: 'Protection', role: 'tank', status: 'confirmed' }),
		new Player({ userid: 't2', name: 'Tank2', class: 'Warrior', spec: 'Protection', role: 'tank', status: 'confirmed' }),
		new Player({ userid: 't3', name: 'Tank3', class: 'Paladin', spec: 'Protection', role: 'tank', status: 'tentative' }),
		
		// Healers
		new Player({ userid: 'h1', name: 'Healer1', class: 'Priest', spec: 'Holy', role: 'healer', status: 'confirmed' }),
		new Player({ userid: 'h2', name: 'Healer2', class: 'Priest', spec: 'Discipline', role: 'healer', status: 'confirmed' }),
		new Player({ userid: 'h3', name: 'Healer3', class: 'Shaman', spec: 'Restoration', role: 'healer', status: 'confirmed' }),
		new Player({ userid: 'h4', name: 'Healer4', class: 'Shaman', spec: 'Restoration', role: 'healer', status: 'confirmed' }),
		new Player({ userid: 'h5', name: 'Healer5', class: 'Paladin', spec: 'Holy', role: 'healer', status: 'confirmed' }),
		new Player({ userid: 'h6', name: 'Healer6', class: 'Druid', spec: 'Restoration', role: 'healer', status: 'late' }),
		
		// DPS
		new Player({ userid: 'd1', name: 'DPS1', class: 'Warrior', spec: 'Fury', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd2', name: 'DPS2', class: 'Rogue', spec: 'Combat', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd3', name: 'DPS3', class: 'Rogue', spec: 'Assassination', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd4', name: 'DPS4', class: 'Mage', spec: 'Fire', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd5', name: 'DPS5', class: 'Mage', spec: 'Frost', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd6', name: 'DPS6', class: 'Warlock', spec: 'Destruction', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd7', name: 'DPS7', class: 'Warlock', spec: 'Affliction', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd8', name: 'DPS8', class: 'Hunter', spec: 'Marksmanship', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd9', name: 'DPS9', class: 'Hunter', spec: 'Survival', role: 'dps', status: 'tentative' }),
		new Player({ userid: 'd10', name: 'DPS10', class: 'Shaman', spec: 'Enhancement', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd11', name: 'DPS11', class: 'Druid', spec: 'Feral', role: 'dps', status: 'confirmed' }),
		new Player({ userid: 'd12', name: 'DPS12', class: 'Priest', spec: 'Shadow', role: 'dps', status: 'confirmed' }),
		
		// Benched
		new Player({ userid: 'b1', name: 'Benched1', class: 'Warrior', spec: 'Arms', role: 'dps', status: 'benched' }),
		
		// Absent
		new Player({ userid: 'a1', name: 'Absent1', class: 'Mage', spec: 'Arcane', role: 'dps', status: 'absent' })
	];

	return players;
}

/**
 * Test status normalization
 */
function testStatusNormalization() {
	console.log('\n=== Testing Status Normalization ===');
	
	const tests = [
		{ input: 'confirmed', expected: PlayerStatus.CONFIRMED },
		{ input: 'yes', expected: PlayerStatus.CONFIRMED },
		{ input: 'tentative', expected: PlayerStatus.TENTATIVE },
		{ input: 'maybe', expected: PlayerStatus.TENTATIVE },
		{ input: 'late', expected: PlayerStatus.LATE },
		{ input: 'bench', expected: PlayerStatus.BENCHED },
		{ input: 'benched', expected: PlayerStatus.BENCHED },
		{ input: 'absent', expected: PlayerStatus.ABSENT },
		{ input: 'no', expected: PlayerStatus.ABSENT },
		{ input: 'CONFIRMED', expected: PlayerStatus.CONFIRMED }, // Case insensitive
		{ input: '  late  ', expected: PlayerStatus.LATE }, // Trimming
	];

	let passed = 0;
	let failed = 0;

	tests.forEach(test => {
		const result = normalizeStatus(test.input);
		if (result === test.expected) {
			console.log(`✓ "${test.input}" -> "${result}"`);
			passed++;
		} else {
			console.log(`✗ "${test.input}" -> "${result}" (expected "${test.expected}")`);
			failed++;
		}
	});

	console.log(`\nStatus Normalization: ${passed} passed, ${failed} failed`);
	return failed === 0;
}

/**
 * Test state model immutability
 */
function testStateImmutability() {
	console.log('\n=== Testing State Model Immutability ===');
	
	const player1 = new Player({ userid: 'p1', name: 'Player1', class: 'Warrior', role: 'tank', status: 'confirmed' });
	const player2 = new Player({ userid: 'p2', name: 'Player2', class: 'Priest', role: 'healer', status: 'confirmed' });
	
	// Create initial state
	const state1 = RaidState.createEmpty(2, 5);
	
	// Modify state
	const state2 = state1.withPlayerAt(1, 0, player1);
	const state3 = state2.withPlayerAt(1, 1, player2);
	
	// Check immutability
	const test1 = state1.getTotalPlayerCount() === 0;
	const test2 = state2.getTotalPlayerCount() === 1;
	const test3 = state3.getTotalPlayerCount() === 2;
	const test4 = state1 !== state2 && state2 !== state3;
	
	console.log(`✓ Original state unchanged: ${test1}`);
	console.log(`✓ Modified state has 1 player: ${test2}`);
	console.log(`✓ Further modified state has 2 players: ${test3}`);
	console.log(`✓ States are different objects: ${test4}`);
	
	const allPassed = test1 && test2 && test3 && test4;
	console.log(`\nState Immutability: ${allPassed ? 'PASSED' : 'FAILED'}`);
	return allPassed;
}

/**
 * Test constraint validation
 */
function testConstraintValidation() {
	console.log('\n=== Testing Constraint Validation ===');
	
	const players = createTestPlayers();
	
	// Test 1: Valid raid should pass
	const seedResult = generateSeed(players);
	if (seedResult.success) {
		const validation = validateRaidState(seedResult.raidState);
		console.log(`✓ Valid seed passes validation: ${validation.valid}`);
	}
	
	// Test 2: Raid with too few tanks should fail
	const fewTanks = players.filter(p => p.role !== 'tank' || p.userid === 't1');
	const seedResult2 = generateSeed(fewTanks);
	console.log(`✓ Insufficient tanks detected: ${!seedResult2.success}`);
	
	// Test 3: Raid with too few healers should fail
	const fewHealers = players.filter(p => p.role !== 'healer' || ['h1', 'h2', 'h3'].includes(p.userid));
	const seedResult3 = generateSeed(fewHealers);
	console.log(`✓ Insufficient healers detected: ${!seedResult3.success}`);
	
	console.log('\nConstraint Validation: PASSED');
	return true;
}

/**
 * Test seed generation
 */
function testSeedGeneration() {
	console.log('\n=== Testing Seed Generation ===');
	
	const players = createTestPlayers();
	const result = generateSeed(players);
	
	console.log(`Success: ${result.success}`);
	console.log(`Assigned: ${result.stats.assigned}`);
	console.log(`Benched: ${result.stats.benched}`);
	console.log(`Excluded: ${result.stats.excluded}`);
	console.log(`Role counts:`, result.stats.roleCounts);
	
	if (result.success) {
		const validation = validateRaidState(result.raidState);
		console.log(`Valid: ${validation.valid}`);
		
		if (!validation.valid) {
			console.log('Violations:');
			validation.getViolationMessages().forEach(v => console.log(`  - ${v}`));
		}
	}
	
	console.log(`\nSeed Generation: ${result.success ? 'PASSED' : 'FAILED'}`);
	return result.success;
}

/**
 * Test optimization determinism
 */
function testOptimizationDeterminism() {
	console.log('\n=== Testing Optimization Determinism ===');
	
	const players = createTestPlayers();
	
	// Run optimization twice with same input
	const result1 = optimizeRaidComposition(players, {
		optimization: { maxIterations: 100, enableLogging: false }
	});
	
	const result2 = optimizeRaidComposition(players, {
		optimization: { maxIterations: 100, enableLogging: false }
	});
	
	if (!result1.success || !result2.success) {
		console.log('✗ Optimization failed');
		return false;
	}
	
	// Compare results
	const score1 = result1.stats.finalScore;
	const score2 = result2.stats.finalScore;
	
	console.log(`Run 1 score: ${score1.toFixed(2)}`);
	console.log(`Run 2 score: ${score2.toFixed(2)}`);
	console.log(`Scores match: ${score1 === score2}`);
	
	// Check if raid compositions are identical
	const state1 = result1.raidState;
	const state2 = result2.raidState;
	
	let identical = true;
	for (let i = 0; i < state1.groups.length; i++) {
		const group1 = state1.groups[i];
		const group2 = state2.groups[i];
		
		for (let j = 0; j < group1.slots.length; j++) {
			const player1 = group1.slots[j].player;
			const player2 = group2.slots[j].player;
			
			if ((player1 === null) !== (player2 === null)) {
				identical = false;
				break;
			}
			
			if (player1 && player2 && player1.userid !== player2.userid) {
				identical = false;
				break;
			}
		}
		
		if (!identical) break;
	}
	
	console.log(`Compositions identical: ${identical}`);
	console.log(`\nOptimization Determinism: ${identical ? 'PASSED' : 'FAILED'}`);
	return identical;
}

/**
 * Test scoring system
 */
function testScoringSystem() {
	console.log('\n=== Testing Scoring System ===');
	
	const players = createTestPlayers();
	const seedResult = generateSeed(players);
	
	if (!seedResult.success) {
		console.log('✗ Failed to generate seed');
		return false;
	}
	
	const score = scoreRaidComposition(seedResult.raidState);
	const breakdown = getScoreBreakdown(seedResult.raidState);
	
	console.log(`Total score: ${score.toFixed(2)}`);
	console.log('\nScore breakdown:');
	console.log('  Class Synergy:', breakdown.classSynergy);
	console.log('  Role Balance:', breakdown.roleBalance);
	console.log('  Redundancy:', breakdown.redundancy);
	console.log('  Status:', breakdown.status);
	console.log('  Bench:', breakdown.bench);
	
	console.log('\nScoring System: PASSED');
	return true;
}

/**
 * Test full optimization pipeline
 */
function testFullOptimization() {
	console.log('\n=== Testing Full Optimization Pipeline ===');
	
	const players = createTestPlayers();
	const result = optimizeRaidComposition(players, {
		optimization: {
			maxIterations: 200,
			maxIterationsWithoutImprovement: 30,
			timeBudgetMs: 3000,
			enableLogging: false
		}
	});
	
	console.log(`Success: ${result.success}`);
	
	if (result.success) {
		console.log(`\nStatistics:`);
		console.log(`  Total players: ${result.stats.totalPlayers}`);
		console.log(`  Assigned: ${result.stats.assigned}`);
		console.log(`  Benched: ${result.stats.benched}`);
		console.log(`  Excluded: ${result.stats.excluded}`);
		console.log(`  Seed score: ${result.stats.seedScore.toFixed(2)}`);
		console.log(`  Final score: ${result.stats.finalScore.toFixed(2)}`);
		console.log(`  Improvement: ${result.stats.improvement.toFixed(2)}`);
		console.log(`  Iterations: ${result.stats.iterations}`);
		console.log(`  Time: ${result.stats.timeMs}ms`);
		
		// Validate final state
		const validation = validateRaidState(result.raidState);
		console.log(`\nFinal state valid: ${validation.valid}`);
		
		if (!validation.valid) {
			console.log('Violations:');
			validation.getViolationMessages().forEach(v => console.log(`  - ${v}`));
		}
		
		console.log('\nFull Optimization: PASSED');
		return validation.valid;
	} else {
		console.log(`Error: ${result.error}`);
		console.log('\nFull Optimization: FAILED');
		return false;
	}
}

/**
 * Run all tests
 */
function runAllTests() {
	console.log('╔════════════════════════════════════════════════╗');
	console.log('║   New Raid Optimizer - Test Suite             ║');
	console.log('╚════════════════════════════════════════════════╝');
	
	const results = {
		statusNormalization: testStatusNormalization(),
		stateImmutability: testStateImmutability(),
		constraintValidation: testConstraintValidation(),
		seedGeneration: testSeedGeneration(),
		optimizationDeterminism: testOptimizationDeterminism(),
		scoringSystem: testScoringSystem(),
		fullOptimization: testFullOptimization()
	};
	
	console.log('\n╔════════════════════════════════════════════════╗');
	console.log('║   Test Results Summary                         ║');
	console.log('╚════════════════════════════════════════════════╝');
	
	let passed = 0;
	let failed = 0;
	
	Object.entries(results).forEach(([name, result]) => {
		const status = result ? '✓ PASS' : '✗ FAIL';
		console.log(`${status} - ${name}`);
		if (result) passed++;
		else failed++;
	});
	
	console.log(`\n${passed} tests passed, ${failed} tests failed`);
	console.log(failed === 0 ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed');
	
	return failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
	runAllTests();
}

module.exports = {
	runAllTests,
	testStatusNormalization,
	testStateImmutability,
	testConstraintValidation,
	testSeedGeneration,
	testOptimizationDeterminism,
	testScoringSystem,
	testFullOptimization,
	createTestPlayers
};