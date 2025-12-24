/**
 * New Raid Optimizer - Main Integration Module
 * 
 * This is the main entry point that integrates all the new optimizer components:
 * 1. Status normalization and parsing
 * 2. Immutable state model
 * 3. Hard constraint validation
 * 4. Greedy seed generation
 * 5. Search-based optimization
 * 6. Weighted scoring
 * 
 * This replaces the old optimizer.js with a deterministic, constraint-safe approach.
 */

const { RaidState } = require('./state-model');
const { generateSeed, canGenerateSeed } = require('./seed-generator');
const { optimize, quickOptimize, deepOptimize } = require('./search-optimizer');
const { scoreRaidComposition, getScoreBreakdown, createScoringFunction } = require('./scoring');
const { validateRaidState, isValidRaidState } = require('./constraints');
const { isAssignableStatus } = require('./status-enums');

/**
 * Main optimizer configuration
 */
const DEFAULT_CONFIG = {
	// Seed generation config
	seed: {
		raid: {
			MAX_RAID_SIZE: 40,
			MIN_TANKS: 2,
			MIN_HEALERS: 5,
			MAX_GROUPS: 8
		},
		group: {
			GROUP_SIZE: 5,
			MAX_TANKS_PER_GROUP: 1,
			MAX_HEALERS_PER_GROUP: 2
		}
	},
	
	// Optimization config
	optimization: {
		maxIterations: 1000,
		maxIterationsWithoutImprovement: 50,
		timeBudgetMs: 5000,
		enableLogging: false
	},
	
	// Scoring weights
	weights: {
		windfuryMeleeBonus: 10,
		shamanHealerDistribution: 5,
		paladinBuffDistribution: 5,
		evenHealerSpread: 8,
		tankSupportCoverage: 6,
		sameClassInGroup: -3,
		tooManyRangedInGroup: -2,
		latePlayerPenalty: -5,
		tentativePlayerPenalty: -2,
		benchingPenalty: -1
	}
};

/**
 * Optimize raid composition using the new deterministic approach
 * 
 * @param {Array} players - Array of Player objects with proper status, role, class
 * @param {Object} config - Configuration object (optional)
 * @returns {Object} Optimization result with raid state and statistics
 */
function optimizeRaidComposition(players, config = {}) {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const startTime = Date.now();

	// Step 1: Validate input
	if (!players || !Array.isArray(players) || players.length === 0) {
		return {
			success: false,
			error: 'No players provided',
			players: [],
			raidState: null
		};
	}

	// Step 2: Check if seed generation is possible
	const feasibility = canGenerateSeed(players, cfg.seed);
	if (!feasibility.possible) {
		return {
			success: false,
			error: `Cannot generate valid raid: ${feasibility.reason}`,
			players,
			raidState: null
		};
	}

	// Step 3: Generate valid seed composition
	const seedResult = generateSeed(players, cfg.seed);
	if (!seedResult.success) {
		return {
			success: false,
			error: seedResult.error,
			violations: seedResult.violations,
			players,
			raidState: null,
			stats: seedResult.stats
		};
	}

	const seedState = seedResult.raidState;
	const seedScore = scoreRaidComposition(seedState, cfg.weights);

	// Step 4: Optimize the seed using local search
	const scoringFunction = createScoringFunction(cfg.weights);
	const optimizationResult = optimize(seedState, scoringFunction, cfg.optimization);

	if (!optimizationResult.success) {
		return {
			success: false,
			error: optimizationResult.error,
			players,
			raidState: seedState,
			stats: seedResult.stats
		};
	}

	const finalState = optimizationResult.finalState;
	const finalScore = optimizationResult.finalScore;

	// Step 5: Final validation
	const validation = validateRaidState(finalState, cfg.seed);
	if (!validation.valid) {
		console.error('WARNING: Final state is invalid!');
		console.error('Violations:', validation.getViolationMessages());
		// Return seed state as fallback
		return {
			success: true,
			warning: 'Optimization produced invalid state, returning seed',
			raidState: seedState,
			players,
			stats: {
				...seedResult.stats,
				seedScore,
				finalScore: seedScore,
				improvement: 0,
				iterations: 0,
				timeMs: Date.now() - startTime
			}
		};
	}

	// Step 6: Return successful result
	return {
		success: true,
		raidState: finalState,
		players,
		stats: {
			...seedResult.stats,
			seedScore,
			finalScore,
			improvement: finalScore - seedScore,
			iterations: optimizationResult.iterations,
			timeMs: Date.now() - startTime
		},
		scoreBreakdown: getScoreBreakdown(finalState, cfg.weights)
	};
}

/**
 * Quick optimization (fast, less thorough)
 */
function quickOptimizeRaid(players, config = {}) {
	const cfg = {
		...DEFAULT_CONFIG,
		...config,
		optimization: {
			maxIterations: 100,
			maxIterationsWithoutImprovement: 20,
			timeBudgetMs: 1000,
			enableLogging: false
		}
	};

	return optimizeRaidComposition(players, cfg);
}

/**
 * Deep optimization (slow, more thorough)
 */
function deepOptimizeRaid(players, config = {}) {
	const cfg = {
		...DEFAULT_CONFIG,
		...config,
		optimization: {
			maxIterations: 5000,
			maxIterationsWithoutImprovement: 200,
			timeBudgetMs: 30000,
			enableLogging: true
		}
	};

	return optimizeRaidComposition(players, cfg);
}

/**
 * Convert raid state to legacy format for compatibility
 */
function convertToLegacyFormat(raidState) {
	const groups = raidState.groups.map(group => {
		return group.slots.map(slot => slot.player).filter(p => p !== null);
	});

	return {
		groups,
		bench: raidState.bench,
		metadata: raidState.metadata
	};
}

/**
 * Optimize and return in legacy format
 */
function optimizeRaidLegacy(players, config = {}) {
	const result = optimizeRaidComposition(players, config);
	
	if (!result.success) {
		return result;
	}

	return {
		...result,
		groups: convertToLegacyFormat(result.raidState).groups,
		bench: result.raidState.bench
	};
}

/**
 * Get detailed analysis of a raid composition
 */
function analyzeRaidComposition(raidState, config = {}) {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	// Validate
	const validation = validateRaidState(raidState, cfg.seed);

	// Score
	const score = scoreRaidComposition(raidState, cfg.weights);
	const breakdown = getScoreBreakdown(raidState, cfg.weights);

	// Statistics
	const stats = {
		totalPlayers: raidState.getTotalPlayerCount(),
		benched: raidState.bench.length,
		roleCounts: raidState.getRoleCounts(),
		statusCounts: raidState.getStatusCounts(),
		classCounts: raidState.getClassCounts()
	};

	// Group analysis
	const groupAnalysis = raidState.groups.map(group => ({
		id: group.id,
		playerCount: group.getFilledCount(),
		roleCounts: group.getRoleCounts(),
		classCounts: group.getClassCounts(),
		players: group.getPlayers().map(p => ({
			name: p.name,
			class: p.class,
			spec: p.spec,
			role: p.role,
			status: p.status
		}))
	}));

	return {
		valid: validation.valid,
		violations: validation.getViolationMessages(),
		score,
		scoreBreakdown: breakdown,
		stats,
		groupAnalysis
	};
}

module.exports = {
	optimizeRaidComposition,
	quickOptimizeRaid,
	deepOptimizeRaid,
	optimizeRaidLegacy,
	analyzeRaidComposition,
	convertToLegacyFormat,
	DEFAULT_CONFIG
};