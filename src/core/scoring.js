/**
 * Weighted Scoring System
 * 
 * Evaluates how good a VALID raid composition is.
 * This module NEVER enforces constraints - only expresses preferences.
 * 
 * Scoring categories:
 * - Class synergy (Windfury, totems, auras, etc.)
 * - Role balance across groups
 * - Redundancy penalties (too many of same class in group)
 * - Status preferences (minimize late players, minimize benching)
 * 
 * All weights are configurable.
 */

/**
 * Default scoring weights
 */
const DEFAULT_WEIGHTS = {
	// Class synergy bonuses
	windfuryMeleeBonus: 10,
	shamanHealerDistribution: 5,
	paladinBuffDistribution: 5,
	
	// Role balance
	evenHealerSpread: 8,
	tankSupportCoverage: 6,
	
	// Redundancy penalties
	sameClassInGroup: -3,
	tooManyRangedInGroup: -2,
	
	// Status preferences
	latePlayerPenalty: -5,
	tentativePlayerPenalty: -2,
	
	// Bench preferences
	benchingPenalty: -1
};

/**
 * Calculate Windfury Totem synergy bonus
 * Shamans with melee DPS in their group get bonus points
 */
function scoreWindfuryTotemSynergy(raidState, weight) {
	let score = 0;

	const meleeClasses = new Set(['Warrior', 'Rogue', 'Hunter']); // Hunter for melee weaving

	raidState.groups.forEach(group => {
		const players = group.getPlayers();
		const hasShamanWithWindfury = players.some(p => 
			p.class === 'Shaman' && 
			(p.spec === 'Enhancement' || p.spec === 'Restoration')
		);

		if (hasShamanWithWindfury) {
			const meleeCount = players.filter(p => meleeClasses.has(p.class)).length;
			score += meleeCount * weight;
		}
	});

	return score;
}

/**
 * Calculate Shaman healer distribution bonus
 * Prefer spreading shaman healers across groups for totems
 */
function scoreShamanHealerDistribution(raidState, weight) {
	const groupsWithShamanHealer = raidState.groups.filter(group => {
		return group.getPlayers().some(p => 
			p.class === 'Shaman' && p.role === 'healer'
		);
	}).length;

	// More groups with shaman healers = better totem coverage
	return groupsWithShamanHealer * weight;
}

/**
 * Calculate Paladin buff distribution bonus
 * Prefer spreading paladins for blessing coverage
 */
function scorePaladinBuffDistribution(raidState, weight) {
	const groupsWithPaladin = raidState.groups.filter(group => {
		return group.getPlayers().some(p => p.class === 'Paladin');
	}).length;

	return groupsWithPaladin * weight;
}

/**
 * Calculate healer distribution evenness
 * Prefer even spread of healers across groups
 */
function scoreEvenHealerSpread(raidState, weight) {
	const healerCounts = raidState.groups.map(g => g.getRoleCounts().healer);
	
	// Calculate standard deviation (lower is better)
	const mean = healerCounts.reduce((a, b) => a + b, 0) / healerCounts.length;
	const variance = healerCounts.reduce((sum, count) => {
		return sum + Math.pow(count - mean, 2);
	}, 0) / healerCounts.length;
	const stdDev = Math.sqrt(variance);

	// Convert to score (lower stdDev = higher score)
	// Use negative stdDev so even distribution gets positive score
	return -stdDev * weight;
}

/**
 * Calculate tank support coverage
 * Prefer having healers in groups with tanks
 */
function scoreTankSupportCoverage(raidState, weight) {
	let score = 0;

	raidState.groups.forEach(group => {
		const roleCounts = group.getRoleCounts();
		if (roleCounts.tank > 0 && roleCounts.healer > 0) {
			score += weight;
		}
	});

	return score;
}

/**
 * Penalize having too many of the same class in one group
 */
function scoreSameClassRedundancy(raidState, weight) {
	let penalty = 0;

	raidState.groups.forEach(group => {
		const classCounts = group.getClassCounts();
		
		// Penalize for each duplicate beyond the first
		Object.values(classCounts).forEach(count => {
			if (count > 1) {
				penalty += (count - 1) * weight;
			}
		});
	});

	return penalty;
}

/**
 * Penalize having too many ranged DPS in one group
 * (for spread mechanics)
 */
function scoreTooManyRangedInGroup(raidState, weight) {
	let penalty = 0;
	const rangedClasses = new Set(['Mage', 'Warlock', 'Hunter', 'Priest']);

	raidState.groups.forEach(group => {
		const rangedCount = group.getPlayers().filter(p => 
			rangedClasses.has(p.class) && p.role === 'dps'
		).length;

		// Penalize if more than 3 ranged in a group
		if (rangedCount > 3) {
			penalty += (rangedCount - 3) * weight;
		}
	});

	return penalty;
}

/**
 * Penalize late players in raid
 */
function scoreLatePlayerPenalty(raidState, weight) {
	const latePlayers = raidState.getAllPlayers().filter(p => 
		p.status === 'late'
	).length;

	return latePlayers * weight;
}

/**
 * Penalize tentative players in raid
 */
function scoreTentativePlayerPenalty(raidState, weight) {
	const tentativePlayers = raidState.getAllPlayers().filter(p => 
		p.status === 'tentative'
	).length;

	return tentativePlayers * weight;
}

/**
 * Penalize benching players
 */
function scoreBenchingPenalty(raidState, weight) {
	return raidState.bench.length * weight;
}

/**
 * Calculate total weighted score for a raid state
 */
function scoreRaidComposition(raidState, weights = {}) {
	const w = { ...DEFAULT_WEIGHTS, ...weights };

	let totalScore = 0;

	// Class synergy
	totalScore += scoreWindfuryTotemSynergy(raidState, w.windfuryMeleeBonus);
	totalScore += scoreShamanHealerDistribution(raidState, w.shamanHealerDistribution);
	totalScore += scorePaladinBuffDistribution(raidState, w.paladinBuffDistribution);

	// Role balance
	totalScore += scoreEvenHealerSpread(raidState, w.evenHealerSpread);
	totalScore += scoreTankSupportCoverage(raidState, w.tankSupportCoverage);

	// Redundancy penalties
	totalScore += scoreSameClassRedundancy(raidState, w.sameClassInGroup);
	totalScore += scoreTooManyRangedInGroup(raidState, w.tooManyRangedInGroup);

	// Status preferences
	totalScore += scoreLatePlayerPenalty(raidState, w.latePlayerPenalty);
	totalScore += scoreTentativePlayerPenalty(raidState, w.tentativePlayerPenalty);

	// Bench preferences
	totalScore += scoreBenchingPenalty(raidState, w.benchingPenalty);

	return totalScore;
}

/**
 * Get detailed scoring breakdown for a raid state
 */
function getScoreBreakdown(raidState, weights = {}) {
	const w = { ...DEFAULT_WEIGHTS, ...weights };

	return {
		classSynergy: {
			windfuryTotem: scoreWindfuryTotemSynergy(raidState, w.windfuryMeleeBonus),
			shamanHealers: scoreShamanHealerDistribution(raidState, w.shamanHealerDistribution),
			paladinBuffs: scorePaladinBuffDistribution(raidState, w.paladinBuffDistribution)
		},
		roleBalance: {
			healerSpread: scoreEvenHealerSpread(raidState, w.evenHealerSpread),
			tankSupport: scoreTankSupportCoverage(raidState, w.tankSupportCoverage)
		},
		redundancy: {
			sameClass: scoreSameClassRedundancy(raidState, w.sameClassInGroup),
			tooManyRanged: scoreTooManyRangedInGroup(raidState, w.tooManyRangedInGroup)
		},
		status: {
			latePlayers: scoreLatePlayerPenalty(raidState, w.latePlayerPenalty),
			tentativePlayers: scoreTentativePlayerPenalty(raidState, w.tentativePlayerPenalty)
		},
		bench: {
			benchedPlayers: scoreBenchingPenalty(raidState, w.benchingPenalty)
		},
		total: scoreRaidComposition(raidState, weights)
	};
}

/**
 * Create a scoring function with custom weights
 */
function createScoringFunction(weights = {}) {
	return (raidState) => scoreRaidComposition(raidState, weights);
}

/**
 * Compare two raid states by score
 */
function compareRaidStates(state1, state2, weights = {}) {
	const score1 = scoreRaidComposition(state1, weights);
	const score2 = scoreRaidComposition(state2, weights);

	return {
		state1Score: score1,
		state2Score: score2,
		difference: score2 - score1,
		better: score2 > score1 ? 'state2' : (score1 > score2 ? 'state1' : 'equal')
	};
}

module.exports = {
	DEFAULT_WEIGHTS,
	scoreRaidComposition,
	getScoreBreakdown,
	createScoringFunction,
	compareRaidStates,
	
	// Individual scoring functions (exported for testing/customization)
	scoreWindfuryTotemSynergy,
	scoreShamanHealerDistribution,
	scorePaladinBuffDistribution,
	scoreEvenHealerSpread,
	scoreTankSupportCoverage,
	scoreSameClassRedundancy,
	scoreTooManyRangedInGroup,
	scoreLatePlayerPenalty,
	scoreTentativePlayerPenalty,
	scoreBenchingPenalty
};