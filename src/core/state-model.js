/**
 * Immutable State Model for Raid Optimizer
 * 
 * This module provides immutable data structures for representing raid compositions.
 * All mutations create new instances rather than modifying existing ones.
 * This enables safe state exploration during optimization.
 */

const { PlayerStatus } = require('./status-enums');

/**
 * Represents a single slot in a group that can hold a player
 */
class Slot {
	constructor(index, player = null) {
		this.index = index;
		this.player = player;
		Object.freeze(this);
	}

	/**
	 * Create a new slot with a different player
	 */
	withPlayer(player) {
		return new Slot(this.index, player);
	}

	/**
	 * Check if slot is empty
	 */
	isEmpty() {
		return this.player === null;
	}

	/**
	 * Check if slot is filled
	 */
	isFilled() {
		return this.player !== null;
	}

	/**
	 * Clone this slot
	 */
	clone() {
		return new Slot(this.index, this.player);
	}
}

/**
 * Represents a raid group (typically 5 players)
 */
class Group {
	constructor(id, slots = []) {
		this.id = id;
		this.slots = slots;
		Object.freeze(this);
	}

	/**
	 * Create a group with specified number of empty slots
	 */
	static createEmpty(id, slotCount = 5) {
		const slots = [];
		for (let i = 0; i < slotCount; i++) {
			slots.push(new Slot(i, null));
		}
		return new Group(id, slots);
	}

	/**
	 * Get all players in this group
	 */
	getPlayers() {
		return this.slots
			.filter(slot => slot.isFilled())
			.map(slot => slot.player);
	}

	/**
	 * Get player at specific slot index
	 */
	getPlayerAt(slotIndex) {
		if (slotIndex < 0 || slotIndex >= this.slots.length) {
			return null;
		}
		return this.slots[slotIndex].player;
	}

	/**
	 * Create a new group with player assigned to slot
	 */
	withPlayerAt(slotIndex, player) {
		if (slotIndex < 0 || slotIndex >= this.slots.length) {
			throw new Error(`Invalid slot index: ${slotIndex}`);
		}

		const newSlots = this.slots.map((slot, idx) => {
			if (idx === slotIndex) {
				return slot.withPlayer(player);
			}
			return slot;
		});

		return new Group(this.id, newSlots);
	}

	/**
	 * Create a new group with player removed from slot
	 */
	withoutPlayerAt(slotIndex) {
		return this.withPlayerAt(slotIndex, null);
	}

	/**
	 * Get number of filled slots
	 */
	getFilledCount() {
		return this.slots.filter(slot => slot.isFilled()).length;
	}

	/**
	 * Get number of empty slots
	 */
	getEmptyCount() {
		return this.slots.filter(slot => slot.isEmpty()).length;
	}

	/**
	 * Check if group is full
	 */
	isFull() {
		return this.getEmptyCount() === 0;
	}

	/**
	 * Check if group is empty
	 */
	isEmpty() {
		return this.getFilledCount() === 0;
	}

	/**
	 * Get first empty slot index, or -1 if none
	 */
	getFirstEmptySlotIndex() {
		for (let i = 0; i < this.slots.length; i++) {
			if (this.slots[i].isEmpty()) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Count players by role
	 */
	getRoleCounts() {
		const counts = { tank: 0, healer: 0, dps: 0 };
		this.getPlayers().forEach(player => {
			const role = player.role || 'dps';
			counts[role] = (counts[role] || 0) + 1;
		});
		return counts;
	}

	/**
	 * Count players by class
	 */
	getClassCounts() {
		const counts = {};
		this.getPlayers().forEach(player => {
			const cls = player.class;
			counts[cls] = (counts[cls] || 0) + 1;
		});
		return counts;
	}

	/**
	 * Check if player is in this group
	 */
	hasPlayer(player) {
		return this.getPlayers().some(p => p.userid === player.userid);
	}

	/**
	 * Clone this group
	 */
	clone() {
		const newSlots = this.slots.map(slot => slot.clone());
		return new Group(this.id, newSlots);
	}
}

/**
 * Represents the complete raid composition
 */
class RaidState {
	constructor(groups = [], bench = [], metadata = {}) {
		this.groups = groups;
		this.bench = bench;
		this.metadata = {
			score: metadata.score || 0,
			violations: metadata.violations || [],
			timestamp: metadata.timestamp || Date.now(),
			...metadata
		};
		Object.freeze(this);
	}

	/**
	 * Create an empty raid with specified number of groups
	 */
	static createEmpty(groupCount = 8, slotsPerGroup = 5) {
		const groups = [];
		for (let i = 0; i < groupCount; i++) {
			groups.push(Group.createEmpty(i + 1, slotsPerGroup));
		}
		return new RaidState(groups, []);
	}

	/**
	 * Get all players in the raid (not including bench)
	 */
	getAllPlayers() {
		return this.groups.flatMap(group => group.getPlayers());
	}

	/**
	 * Get total number of players in raid
	 */
	getTotalPlayerCount() {
		return this.getAllPlayers().length;
	}

	/**
	 * Get player counts by role across entire raid
	 */
	getRoleCounts() {
		const counts = { tank: 0, healer: 0, dps: 0 };
		this.getAllPlayers().forEach(player => {
			const role = player.role || 'dps';
			counts[role] = (counts[role] || 0) + 1;
		});
		return counts;
	}

	/**
	 * Get player counts by class across entire raid
	 */
	getClassCounts() {
		const counts = {};
		this.getAllPlayers().forEach(player => {
			const cls = player.class;
			counts[cls] = (counts[cls] || 0) + 1;
		});
		return counts;
	}

	/**
	 * Get player counts by status across entire raid
	 */
	getStatusCounts() {
		const counts = {
			confirmed: 0,
			tentative: 0,
			late: 0,
			benched: this.bench.length,
			absence: 0
		};
		
		this.getAllPlayers().forEach(player => {
			const status = player.status || 'confirmed';
			counts[status] = (counts[status] || 0) + 1;
		});
		
		return counts;
	}

	/**
	 * Get group by ID
	 */
	getGroup(groupId) {
		return this.groups.find(g => g.id === groupId);
	}

	/**
	 * Create new raid state with updated group
	 */
	withGroup(groupId, newGroup) {
		const newGroups = this.groups.map(g => 
			g.id === groupId ? newGroup : g
		);
		return new RaidState(newGroups, this.bench, this.metadata);
	}

	/**
	 * Create new raid state with player assigned to specific group/slot
	 */
	withPlayerAt(groupId, slotIndex, player) {
		const group = this.getGroup(groupId);
		if (!group) {
			throw new Error(`Group ${groupId} not found`);
		}

		const newGroup = group.withPlayerAt(slotIndex, player);
		return this.withGroup(groupId, newGroup);
	}

	/**
	 * Create new raid state with player removed from specific group/slot
	 */
	withoutPlayerAt(groupId, slotIndex) {
		return this.withPlayerAt(groupId, slotIndex, null);
	}

	/**
	 * Create new raid state with updated bench
	 */
	withBench(newBench) {
		return new RaidState(this.groups, newBench, this.metadata);
	}

	/**
	 * Create new raid state with player added to bench
	 */
	withPlayerBenched(player) {
		const newBench = [...this.bench, player];
		return new RaidState(this.groups, newBench, this.metadata);
	}

	/**
	 * Create new raid state with updated metadata
	 */
	withMetadata(newMetadata) {
		return new RaidState(this.groups, this.bench, {
			...this.metadata,
			...newMetadata
		});
	}

	/**
	 * Create new raid state with updated score
	 */
	withScore(score) {
		return this.withMetadata({ score });
	}

	/**
	 * Create new raid state with violations
	 */
	withViolations(violations) {
		return this.withMetadata({ violations });
	}

	/**
	 * Find which group and slot a player is in
	 * Returns { groupId, slotIndex } or null if not found
	 */
	findPlayer(player) {
		for (const group of this.groups) {
			for (let i = 0; i < group.slots.length; i++) {
				const slotPlayer = group.slots[i].player;
				if (slotPlayer && slotPlayer.userid === player.userid) {
					return { groupId: group.id, slotIndex: i };
				}
			}
		}
		return null;
	}

	/**
	 * Check if player is in the raid
	 */
	hasPlayer(player) {
		return this.findPlayer(player) !== null;
	}

	/**
	 * Check if player is on bench
	 */
	isPlayerBenched(player) {
		return this.bench.some(p => p.userid === player.userid);
	}

	/**
	 * Swap two players in the raid
	 * Returns new raid state with players swapped
	 */
	swapPlayers(player1Pos, player2Pos) {
		// player1Pos and player2Pos are { groupId, slotIndex }
		const player1 = this.getGroup(player1Pos.groupId).getPlayerAt(player1Pos.slotIndex);
		const player2 = this.getGroup(player2Pos.groupId).getPlayerAt(player2Pos.slotIndex);

		let newState = this;
		newState = newState.withPlayerAt(player1Pos.groupId, player1Pos.slotIndex, player2);
		newState = newState.withPlayerAt(player2Pos.groupId, player2Pos.slotIndex, player1);

		return newState;
	}

	/**
	 * Deep clone this raid state
	 */
	clone() {
		const newGroups = this.groups.map(g => g.clone());
		const newBench = [...this.bench];
		const newMetadata = { ...this.metadata };
		return new RaidState(newGroups, newBench, newMetadata);
	}

	/**
	 * Convert to plain object for serialization
	 */
	toJSON() {
		return {
			groups: this.groups.map(g => ({
				id: g.id,
				slots: g.slots.map(s => ({
					index: s.index,
					player: s.player
				}))
			})),
			bench: this.bench,
			metadata: this.metadata
		};
	}

	/**
	 * Create raid state from plain object
	 */
	static fromJSON(json) {
		const groups = json.groups.map(g => {
			const slots = g.slots.map(s => new Slot(s.index, s.player));
			return new Group(g.id, slots);
		});
		return new RaidState(groups, json.bench, json.metadata);
	}
}

module.exports = {
	Slot,
	Group,
	RaidState
};