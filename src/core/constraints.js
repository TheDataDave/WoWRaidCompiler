/**
 * Hard Constraint Validation System
 * 
 * This module defines and validates all hard constraints that must NEVER be violated.
 * Any raid state violating these constraints is invalid and should be rejected immediately.
 * 
 * Constraints are NOT penalties - they are binary pass/fail checks.
 */

const { PlayerStatus, isAssignableStatus, shouldExclude } = require('./status-enums');

/**
 * Constraint violation result
 */
class ConstraintViolation {
	constructor(level, constraint, message, details = {}) {
		this.level = level; // 'raid', 'group', 'player'
		this.constraint = constraint; // constraint name
		this.message = message;
		this.details = details;
	}

	toString() {
		return `[${this.level}] ${this.constraint}: ${this.message}`;
	}
}

/**
 * Constraint validation result
 */
class ValidationResult {
	constructor(valid = true, violations = []) {
		this.valid = valid;
		this.violations = violations;
	}

	/**
	 * Add a violation to this result
	 */
	addViolation(violation) {
		this.violations.push(violation);
		this.valid = false;
	}

	/**
	 * Merge another validation result into this one
	 */
	merge(other) {
		if (!other.valid) {
			this.valid = false;
			this.violations.push(...other.violations);
		}
	}

	/**
	 * Get all violations as strings
	 */
	getViolationMessages() {
		return this.violations.map(v => v.toString());
	}
}

/**
 * Raid-level constraint configuration
 */
const RAID_CONSTRAINTS = {
	MAX_RAID_SIZE: 40,
	MIN_TANKS: 2,
	MIN_HEALERS: 5,
	SLOTS_PER_GROUP: 5,
	MAX_GROUPS: 8
};

/**
 * Group-level constraint configuration
 */
const GROUP_CONSTRAINTS = {
	GROUP_SIZE: 5,
	MAX_TANKS_PER_GROUP: 1,
	MAX_HEALERS_PER_GROUP: 2
};

/**
 * Validate raid-level constraints
 */
function validateRaidConstraints(raidState, config = RAID_CONSTRAINTS) {
	const result = new ValidationResult();
	const players = raidState.getAllPlayers();
	const roleCounts = raidState.getRoleCounts();

	// Check total raid size
	if (players.length > config.MAX_RAID_SIZE) {
		result.addViolation(new ConstraintViolation(
			'raid',
			'MAX_RAID_SIZE',
			`Raid has ${players.length} players, exceeds maximum of ${config.MAX_RAID_SIZE}`,
			{ current: players.length, max: config.MAX_RAID_SIZE }
		));
	}

	// Check minimum tanks
	if (roleCounts.tank < config.MIN_TANKS) {
		result.addViolation(new ConstraintViolation(
			'raid',
			'MIN_TANKS',
			`Raid has ${roleCounts.tank} tanks, requires minimum of ${config.MIN_TANKS}`,
			{ current: roleCounts.tank, required: config.MIN_TANKS }
		));
	}

	// Check minimum healers
	if (roleCounts.healer < config.MIN_HEALERS) {
		result.addViolation(new ConstraintViolation(
			'raid',
			'MIN_HEALERS',
			`Raid has ${roleCounts.healer} healers, requires minimum of ${config.MIN_HEALERS}`,
			{ current: roleCounts.healer, required: config.MIN_HEALERS }
		));
	}

	// Check for duplicate player assignments
	const playerIds = new Set();
	const duplicates = [];
	players.forEach(player => {
		if (playerIds.has(player.userid)) {
			duplicates.push(player.name);
		}
		playerIds.add(player.userid);
	});

	if (duplicates.length > 0) {
		result.addViolation(new ConstraintViolation(
			'raid',
			'NO_DUPLICATES',
			`Players assigned to multiple slots: ${duplicates.join(', ')}`,
			{ duplicates }
		));
	}

	return result;
}

/**
 * Validate group-level constraints
 */
function validateGroupConstraints(group, config = GROUP_CONSTRAINTS) {
	const result = new ValidationResult();
	const players = group.getPlayers();
	const roleCounts = group.getRoleCounts();

	// Check group size
	if (players.length > config.GROUP_SIZE) {
		result.addViolation(new ConstraintViolation(
			'group',
			'GROUP_SIZE',
			`Group ${group.id} has ${players.length} players, exceeds maximum of ${config.GROUP_SIZE}`,
			{ groupId: group.id, current: players.length, max: config.GROUP_SIZE }
		));
	}

	// Check tank cap per group
	if (roleCounts.tank > config.MAX_TANKS_PER_GROUP) {
		result.addViolation(new ConstraintViolation(
			'group',
			'MAX_TANKS_PER_GROUP',
			`Group ${group.id} has ${roleCounts.tank} tanks, exceeds maximum of ${config.MAX_TANKS_PER_GROUP}`,
			{ groupId: group.id, current: roleCounts.tank, max: config.MAX_TANKS_PER_GROUP }
		));
	}

	// Check healer cap per group
	if (roleCounts.healer > config.MAX_HEALERS_PER_GROUP) {
		result.addViolation(new ConstraintViolation(
			'group',
			'MAX_HEALERS_PER_GROUP',
			`Group ${group.id} has ${roleCounts.healer} healers, exceeds maximum of ${config.MAX_HEALERS_PER_GROUP}`,
			{ groupId: group.id, current: roleCounts.healer, max: config.MAX_HEALERS_PER_GROUP }
		));
	}

	// Check for duplicate players within group
	const playerIds = new Set();
	const duplicates = [];
	players.forEach(player => {
		if (playerIds.has(player.userid)) {
			duplicates.push(player.name);
		}
		playerIds.add(player.userid);
	});

	if (duplicates.length > 0) {
		result.addViolation(new ConstraintViolation(
			'group',
			'NO_DUPLICATES_IN_GROUP',
			`Group ${group.id} has duplicate players: ${duplicates.join(', ')}`,
			{ groupId: group.id, duplicates }
		));
	}

	return result;
}

/**
 * Validate player-level constraints
 */
function validatePlayerConstraints(player, raidState) {
	const result = new ValidationResult();

	// Check if player should be excluded (absent status)
	if (shouldExclude(player.status)) {
		// Check if player is in raid (should not be)
		if (raidState.hasPlayer(player)) {
			result.addViolation(new ConstraintViolation(
				'player',
				'ABSENT_PLAYER_ASSIGNED',
				`Player ${player.name} has status '${player.status}' but is assigned to raid`,
				{ player: player.name, status: player.status }
			));
		}
	}

	// Check if benched player is in raid
	if (player.status === PlayerStatus.BENCHED) {
		if (raidState.hasPlayer(player)) {
			result.addViolation(new ConstraintViolation(
				'player',
				'BENCHED_PLAYER_ASSIGNED',
				`Player ${player.name} is marked as benched but is assigned to raid`,
				{ player: player.name }
			));
		}
	}

	// Check if player has valid role
	if (!player.role || !['tank', 'healer', 'dps'].includes(player.role)) {
		result.addViolation(new ConstraintViolation(
			'player',
			'INVALID_ROLE',
			`Player ${player.name} has invalid role: ${player.role}`,
			{ player: player.name, role: player.role }
		));
	}

	// Check if player has valid class
	if (!player.class) {
		result.addViolation(new ConstraintViolation(
			'player',
			'MISSING_CLASS',
			`Player ${player.name} has no class assigned`,
			{ player: player.name }
		));
	}

	return result;
}

/**
 * Validate all constraints for a raid state
 */
function validateRaidState(raidState, config = {}) {
	const raidConfig = { ...RAID_CONSTRAINTS, ...config.raid };
	const groupConfig = { ...GROUP_CONSTRAINTS, ...config.group };

	const result = new ValidationResult();

	// Validate raid-level constraints
	result.merge(validateRaidConstraints(raidState, raidConfig));

	// Validate each group
	raidState.groups.forEach(group => {
		result.merge(validateGroupConstraints(group, groupConfig));
	});

	// Validate each player in raid
	raidState.getAllPlayers().forEach(player => {
		result.merge(validatePlayerConstraints(player, raidState));
	});

	// Validate bench players
	raidState.bench.forEach(player => {
		// Benched players should not be in raid
		if (raidState.hasPlayer(player)) {
			result.addViolation(new ConstraintViolation(
				'player',
				'BENCHED_PLAYER_IN_RAID',
				`Player ${player.name} is on bench but also in raid`,
				{ player: player.name }
			));
		}
	});

	return result;
}

/**
 * Quick check if raid state is valid (no detailed violations)
 */
function isValidRaidState(raidState, config = {}) {
	return validateRaidState(raidState, config).valid;
}

/**
 * Validate a potential player swap before executing it
 */
function validateSwap(raidState, pos1, pos2) {
	const result = new ValidationResult();

	// Get the groups involved
	const group1 = raidState.getGroup(pos1.groupId);
	const group2 = raidState.getGroup(pos2.groupId);

	if (!group1) {
		result.addViolation(new ConstraintViolation(
			'swap',
			'INVALID_GROUP',
			`Group ${pos1.groupId} does not exist`,
			{ groupId: pos1.groupId }
		));
	}

	if (!group2) {
		result.addViolation(new ConstraintViolation(
			'swap',
			'INVALID_GROUP',
			`Group ${pos2.groupId} does not exist`,
			{ groupId: pos2.groupId }
		));
	}

	if (!result.valid) {
		return result;
	}

	// Get the players
	const player1 = group1.getPlayerAt(pos1.slotIndex);
	const player2 = group2.getPlayerAt(pos2.slotIndex);

	// At least one slot must have a player
	if (!player1 && !player2) {
		result.addViolation(new ConstraintViolation(
			'swap',
			'EMPTY_SWAP',
			'Cannot swap two empty slots',
			{ pos1, pos2 }
		));
		return result;
	}

	// Simulate the swap and validate the resulting state
	const newState = raidState.swapPlayers(pos1, pos2);
	return validateRaidState(newState);
}

/**
 * Get constraint configuration
 */
function getConstraintConfig() {
	return {
		raid: { ...RAID_CONSTRAINTS },
		group: { ...GROUP_CONSTRAINTS }
	};
}

/**
 * Update constraint configuration
 */
function updateConstraintConfig(updates) {
	if (updates.raid) {
		Object.assign(RAID_CONSTRAINTS, updates.raid);
	}
	if (updates.group) {
		Object.assign(GROUP_CONSTRAINTS, updates.group);
	}
}

module.exports = {
	ConstraintViolation,
	ValidationResult,
	RAID_CONSTRAINTS,
	GROUP_CONSTRAINTS,
	validateRaidConstraints,
	validateGroupConstraints,
	validatePlayerConstraints,
	validateRaidState,
	isValidRaidState,
	validateSwap,
	getConstraintConfig,
	updateConstraintConfig
};