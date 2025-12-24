/**
 * Search-Based Optimizer
 * 
 * Improves an already-valid raid composition using local search techniques.
 * Only explores valid states - any neighbor that violates constraints is discarded.
 * 
 * Techniques:
 * - Pairwise player swaps
 * - Group-to-group swaps
 * - Role-preserving swaps only
 * 
 * Stopping conditions:
 * - Max iterations reached
 * - No score improvement for N iterations
 * - Time budget exceeded
 */

const { isValidRaidState, validateSwap } = require('./constraints');

/**
 * Configuration for search optimizer
 */
const DEFAULT_CONFIG = {
	maxIterations: 1000,
	maxIterationsWithoutImprovement: 50,
	timeBudgetMs: 5000,
	enableLogging: false
};

/**
 * Generate all possible pairwise swaps between players in the raid
 */
function generateSwapNeighbors(raidState) {
	const neighbors = [];
	const groups = raidState.groups;

	// Generate all possible swaps between filled slots
	for (let g1 = 0; g1 < groups.length; g1++) {
		const group1 = groups[g1];
		
		for (let s1 = 0; s1 < group1.slots.length; s1++) {
			const player1 = group1.slots[s1].player;
			if (!player1) continue; // Skip empty slots

			// Try swapping with all other slots (including empty ones)
			for (let g2 = g1; g2 < groups.length; g2++) {
				const group2 = groups[g2];
				const startSlot = (g2 === g1) ? s1 + 1 : 0;

				for (let s2 = startSlot; s2 < group2.slots.length; s2++) {
					const player2 = group2.slots[s2].player;
					
					// Skip if both slots are the same
					if (g1 === g2 && s1 === s2) continue;

					// Create position objects
					const pos1 = { groupId: group1.id, slotIndex: s1 };
					const pos2 = { groupId: group2.id, slotIndex: s2 };

					neighbors.push({ pos1, pos2, player1, player2 });
				}
			}
		}
	}

	return neighbors;
}

/**
 * Generate role-preserving swaps only
 * This ensures we don't violate role constraints
 */
function generateRolePreservingSwaps(raidState) {
	const allSwaps = generateSwapNeighbors(raidState);
	
	// Filter to only swaps that preserve roles or involve empty slots
	return allSwaps.filter(swap => {
		const { player1, player2 } = swap;
		
		// Allow swaps with empty slots
		if (!player1 || !player2) return true;
		
		// Only allow swaps between same role
		return player1.role === player2.role;
	});
}

/**
 * Evaluate a neighbor state and return it with score if valid
 */
function evaluateNeighbor(raidState, swap, scoringFunction) {
	const { pos1, pos2 } = swap;

	// Validate the swap
	const validation = validateSwap(raidState, pos1, pos2);
	if (!validation.valid) {
		return null; // Invalid neighbor, discard
	}

	// Execute the swap
	const newState = raidState.swapPlayers(pos1, pos2);

	// Validate the resulting state
	if (!isValidRaidState(newState)) {
		return null; // Invalid state, discard
	}

	// Score the valid state
	const score = scoringFunction(newState);
	const scoredState = newState.withScore(score);

	return scoredState;
}

/**
 * Perform local search optimization
 */
function optimizeWithLocalSearch(initialState, scoringFunction, config = {}) {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const startTime = Date.now();

	let currentState = initialState;
	let currentScore = scoringFunction(currentState);
	currentState = currentState.withScore(currentScore);

	let bestState = currentState;
	let bestScore = currentScore;

	let iteration = 0;
	let iterationsWithoutImprovement = 0;

	const log = cfg.enableLogging ? console.log : () => {};

	log('=== Local Search Optimization Started ===');
	log(`Initial score: ${currentScore.toFixed(2)}`);

	while (iteration < cfg.maxIterations) {
		iteration++;

		// Check time budget
		const elapsed = Date.now() - startTime;
		if (elapsed > cfg.timeBudgetMs) {
			log(`Time budget exceeded after ${iteration} iterations`);
			break;
		}

		// Generate neighbor states
		const swaps = generateRolePreservingSwaps(currentState);
		
		if (swaps.length === 0) {
			log('No valid swaps available');
			break;
		}

		// Evaluate all neighbors and find the best valid one
		let bestNeighbor = null;
		let bestNeighborScore = currentScore;

		for (const swap of swaps) {
			const neighbor = evaluateNeighbor(currentState, swap, scoringFunction);
			
			if (neighbor && neighbor.metadata.score > bestNeighborScore) {
				bestNeighbor = neighbor;
				bestNeighborScore = neighbor.metadata.score;
			}
		}

		// If we found a better neighbor, move to it
		if (bestNeighbor && bestNeighborScore > currentScore) {
			currentState = bestNeighbor;
			currentScore = bestNeighborScore;
			iterationsWithoutImprovement = 0;

			// Update best state if this is the best we've seen
			if (currentScore > bestScore) {
				bestState = currentState;
				bestScore = currentScore;
				log(`Iteration ${iteration}: New best score ${bestScore.toFixed(2)}`);
			}
		} else {
			// No improvement found
			iterationsWithoutImprovement++;

			if (iterationsWithoutImprovement >= cfg.maxIterationsWithoutImprovement) {
				log(`No improvement for ${cfg.maxIterationsWithoutImprovement} iterations, stopping`);
				break;
			}
		}
	}

	const elapsed = Date.now() - startTime;
	log('=== Optimization Complete ===');
	log(`Iterations: ${iteration}`);
	log(`Time: ${elapsed}ms`);
	log(`Initial score: ${scoringFunction(initialState).toFixed(2)}`);
	log(`Final score: ${bestScore.toFixed(2)}`);
	log(`Improvement: ${(bestScore - scoringFunction(initialState)).toFixed(2)}`);

	return {
		success: true,
		initialState,
		finalState: bestState,
		initialScore: scoringFunction(initialState),
		finalScore: bestScore,
		improvement: bestScore - scoringFunction(initialState),
		iterations: iteration,
		timeMs: elapsed
	};
}

/**
 * Optimize with multiple restarts to avoid local optima
 */
function optimizeWithRestarts(initialState, scoringFunction, config = {}) {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const restarts = cfg.restarts || 1;

	let bestResult = null;
	let bestScore = -Infinity;

	for (let i = 0; i < restarts; i++) {
		const result = optimizeWithLocalSearch(initialState, scoringFunction, cfg);

		if (result.finalScore > bestScore) {
			bestResult = result;
			bestScore = result.finalScore;
		}
	}

	return bestResult;
}

/**
 * Quick optimization with limited iterations (for fast results)
 */
function quickOptimize(initialState, scoringFunction) {
	return optimizeWithLocalSearch(initialState, scoringFunction, {
		maxIterations: 100,
		maxIterationsWithoutImprovement: 20,
		timeBudgetMs: 1000,
		enableLogging: false
	});
}

/**
 * Deep optimization with many iterations (for best results)
 */
function deepOptimize(initialState, scoringFunction) {
	return optimizeWithLocalSearch(initialState, scoringFunction, {
		maxIterations: 5000,
		maxIterationsWithoutImprovement: 200,
		timeBudgetMs: 30000,
		enableLogging: true
	});
}

/**
 * Optimize with custom configuration
 */
function optimize(initialState, scoringFunction, config = {}) {
	// Validate initial state
	if (!isValidRaidState(initialState)) {
		return {
			success: false,
			error: 'Initial state is invalid',
			initialState,
			finalState: null
		};
	}

	// Run optimization
	return optimizeWithLocalSearch(initialState, scoringFunction, config);
}

module.exports = {
	optimize,
	optimizeWithLocalSearch,
	optimizeWithRestarts,
	quickOptimize,
	deepOptimize,
	generateSwapNeighbors,
	generateRolePreservingSwaps,
	evaluateNeighbor,
	DEFAULT_CONFIG
};