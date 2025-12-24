/**
 * Greedy Seed Generator
 * 
 * Produces a valid starting raid composition as quickly as possible.
 * Quality is secondary to correctness - the goal is to get a valid state
 * that can then be optimized by the search algorithm.
 * 
 * Algorithm:
 * 1. Place mandatory roles first (tanks, healers)
 * 2. Fill remaining slots by role priority
 * 3. Prefer confirmed > tentative > late
 * 4. Bench overflow players
 * 5. Fail loudly if constraints cannot be satisfied
 */

const { RaidState, Group } = require('./state-model');
const { isValidRaidState, validateRaidState, RAID_CONSTRAINTS, GROUP_CONSTRAINTS } = require('./constraints');
const { isAssignableStatus, shouldExclude, shouldBench, getStatusPriority } = require('./status-enums');

/**
 * Sort players by priority for assignment
 * Priority order:
 * 1. Role (tanks > healers > dps)
 * 2. Status (confirmed > tentative > late)
 * 3. Signup time (earlier > later)
 */
function sortPlayersByPriority(players) {
	const rolePriority = {
		'tank': 300,
		'healer': 200,
		'dps': 100
	};

	return [...players].sort((a, b) => {
		// First by role
		const roleA = rolePriority[a.role] || 0;
		const roleB = rolePriority[b.role] || 0;
		if (roleA !== roleB) {
			return roleB - roleA; // Higher priority first
		}

		// Then by status
		const statusA = getStatusPriority(a.status);
		const statusB = getStatusPriority(b.status);
		if (statusA !== statusB) {
			return statusB - statusA; // Higher priority first
		}

		// Finally by signup time (earlier is better)
		const timeA = a.signuptime || 0;
		const timeB = b.signuptime || 0;
		return timeA - timeB;
	});
}

/**
 * Filter players who can be assigned to raid
 */
function getAssignablePlayers(players) {
	return players.filter(player => {
		// Exclude absent players
		if (shouldExclude(player.status)) {
			return false;
		}
		
		// Exclude benched players
		if (shouldBench(player.status)) {
			return false;
		}
		
		// Must have valid role
		if (!player.role || !['tank', 'healer', 'dps'].includes(player.role)) {
			return false;
		}
		
		// Must have valid class
		if (!player.class) {
			return false;
		}
		
		return true;
	});
}

/**
 * Get players who should be automatically benched
 */
function getBenchedPlayers(players) {
	return players.filter(player => shouldBench(player.status));
}

/**
 * Find the best group to place a player in
 * Returns { groupId, slotIndex } or null if no valid placement
 */
function findBestGroupForPlayer(raidState, player, config) {
	const groupConfig = config.group || GROUP_CONSTRAINTS;

	// Try each group in order
	for (const group of raidState.groups) {
		// Skip full groups
		if (group.isFull()) {
			continue;
		}

		// Check role constraints
		const roleCounts = group.getRoleCounts();
		
		if (player.role === 'tank' && roleCounts.tank >= groupConfig.MAX_TANKS_PER_GROUP) {
			continue;
		}
		
		if (player.role === 'healer' && roleCounts.healer >= groupConfig.MAX_HEALERS_PER_GROUP) {
			continue;
		}

		// Find first empty slot
		const slotIndex = group.getFirstEmptySlotIndex();
		if (slotIndex !== -1) {
			return { groupId: group.id, slotIndex };
		}
	}

	return null;
}

/**
 * Generate a valid seed raid composition
 */
function generateSeed(players, config = {}) {
	const raidConfig = { ...RAID_CONSTRAINTS, ...config.raid };
	const groupConfig = { ...GROUP_CONSTRAINTS, ...config.group };

	// Separate players by assignability
	const assignable = getAssignablePlayers(players);
	const benched = getBenchedPlayers(players);
	const excluded = players.filter(p => shouldExclude(p.status));

	// Sort assignable players by priority
	const sorted = sortPlayersByPriority(assignable);

	// Create empty raid
	let raidState = RaidState.createEmpty(
		raidConfig.MAX_GROUPS || 8,
		groupConfig.GROUP_SIZE || 5
	);

	// Start with empty bench (will add benched players at the end)
	const finalBench = [...benched];
	const unassigned = [];

	// Assign players one by one
	for (const player of sorted) {
		const placement = findBestGroupForPlayer(raidState, player, { group: groupConfig });
		
		if (placement) {
			// Assign player to group
			raidState = raidState.withPlayerAt(placement.groupId, placement.slotIndex, player);
		} else {
			// Could not place player - add to unassigned
			unassigned.push(player);
		}
	}

	// Add unassigned players to bench
	finalBench.push(...unassigned);
	raidState = raidState.withBench(finalBench);

	// Validate the result
	const validation = validateRaidState(raidState, { raid: raidConfig, group: groupConfig });

	if (!validation.valid) {
		// Seed generation failed - return error
		return {
			success: false,
			error: 'Failed to generate valid seed composition',
			violations: validation.getViolationMessages(),
			raidState: null,
			stats: {
				totalPlayers: players.length,
				assigned: raidState.getTotalPlayerCount(),
				benched: finalBench.length,
				excluded: excluded.length
			}
		};
	}

	// Success!
	return {
		success: true,
		raidState,
		stats: {
			totalPlayers: players.length,
			assigned: raidState.getTotalPlayerCount(),
			benched: finalBench.length,
			excluded: excluded.length,
			roleCounts: raidState.getRoleCounts(),
			statusCounts: raidState.getStatusCounts()
		}
	};
}

/**
 * Generate seed with detailed logging
 */
function generateSeedWithLogging(players, config = {}) {
	console.log('=== Seed Generation Started ===');
	console.log(`Total players: ${players.length}`);

	const assignable = getAssignablePlayers(players);
	const benched = getBenchedPlayers(players);
	const excluded = players.filter(p => shouldExclude(p.status));

	console.log(`Assignable: ${assignable.length}`);
	console.log(`Auto-benched: ${benched.length}`);
	console.log(`Excluded: ${excluded.length}`);

	const result = generateSeed(players, config);

	if (result.success) {
		console.log('=== Seed Generation Successful ===');
		console.log(`Assigned: ${result.stats.assigned}`);
		console.log(`Benched: ${result.stats.benched}`);
		console.log(`Role counts:`, result.stats.roleCounts);
		console.log(`Status counts:`, result.stats.statusCounts);
	} else {
		console.log('=== Seed Generation Failed ===');
		console.log(`Error: ${result.error}`);
		console.log('Violations:');
		result.violations.forEach(v => console.log(`  - ${v}`));
	}

	return result;
}

/**
 * Check if seed generation is possible given player pool
 */
function canGenerateSeed(players, config = {}) {
	const raidConfig = { ...RAID_CONSTRAINTS, ...config.raid };
	const assignable = getAssignablePlayers(players);
	
	// Count roles
	const roleCounts = { tank: 0, healer: 0, dps: 0 };
	assignable.forEach(player => {
		const role = player.role || 'dps';
		roleCounts[role]++;
	});

	// Check if we have minimum required roles
	if (roleCounts.tank < raidConfig.MIN_TANKS) {
		return {
			possible: false,
			reason: `Not enough tanks: have ${roleCounts.tank}, need ${raidConfig.MIN_TANKS}`
		};
	}

	if (roleCounts.healer < raidConfig.MIN_HEALERS) {
		return {
			possible: false,
			reason: `Not enough healers: have ${roleCounts.healer}, need ${raidConfig.MIN_HEALERS}`
		};
	}

	return {
		possible: true,
		roleCounts
	};
}

module.exports = {
	generateSeed,
	generateSeedWithLogging,
	canGenerateSeed,
	sortPlayersByPriority,
	getAssignablePlayers,
	getBenchedPlayers,
	findBestGroupForPlayer
};