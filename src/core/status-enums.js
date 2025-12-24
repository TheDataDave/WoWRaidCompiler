/**
 * Status Enums and Mapping
 * 
 * Defines the canonical status values used throughout the optimizer
 * and provides mapping functions from external sources (raid-helper, etc.)
 */

// Canonical internal status values
const PlayerStatus = {
  CONFIRMED: 'confirmed',
  TENTATIVE: 'tentative',
  LATE: 'late',
  BENCHED: 'benched',
  ABSENT: 'absent'
};

// Mapping from raid-helper status strings to internal enums
const RAID_HELPER_STATUS_MAP = {
  // Confirmed variations
  'confirmed': PlayerStatus.CONFIRMED,
  'yes': PlayerStatus.CONFIRMED,
  'signup': PlayerStatus.CONFIRMED,
  'accepted': PlayerStatus.CONFIRMED,
  
  // Tentative variations
  'tentative': PlayerStatus.TENTATIVE,
  'maybe': PlayerStatus.TENTATIVE,
  'uncertain': PlayerStatus.TENTATIVE,
  
  // Late variations
  'late': PlayerStatus.LATE,
  'delayed': PlayerStatus.LATE,
  
  // Benched variations
  'bench': PlayerStatus.BENCHED,
  'benched': PlayerStatus.BENCHED,
  'backup': PlayerStatus.BENCHED,
  
  // Absent variations
  'absent': PlayerStatus.ABSENT,
  'no': PlayerStatus.ABSENT,
  'declined': PlayerStatus.ABSENT,
  'unavailable': PlayerStatus.ABSENT
};

/**
 * Normalize a status string from an external source to internal enum
 * @param {string} externalStatus - Status string from raid-helper or other source
 * @param {string} defaultStatus - Default status if mapping fails
 * @returns {string} Normalized status enum value
 */
function normalizeStatus(externalStatus, defaultStatus = PlayerStatus.CONFIRMED) {
  if (!externalStatus) {
    return defaultStatus;
  }
  
  // Convert to lowercase and trim
  const normalized = externalStatus.toLowerCase().trim();
  
  // Look up in mapping
  const mappedStatus = RAID_HELPER_STATUS_MAP[normalized];
  
  if (!mappedStatus) {
    console.warn(`Unknown status value: "${externalStatus}", defaulting to ${defaultStatus}`);
    return defaultStatus;
  }
  
  return mappedStatus;
}

/**
 * Validate that a status value is one of the canonical enums
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
function isValidStatus(status) {
  return Object.values(PlayerStatus).includes(status);
}

/**
 * Get all valid status values
 * @returns {string[]} Array of valid status values
 */
function getValidStatuses() {
  return Object.values(PlayerStatus);
}

/**
 * Check if a player with given status should be included in raid assignments
 * @param {string} status - Player status
 * @returns {boolean} True if player can be assigned to groups
 */
function isAssignableStatus(status) {
  return status === PlayerStatus.CONFIRMED || 
         status === PlayerStatus.TENTATIVE || 
         status === PlayerStatus.LATE;
}

/**
 * Check if a player with given status should be automatically benched
 * @param {string} status - Player status
 * @returns {boolean} True if player should be benched
 */
function shouldBench(status) {
  return status === PlayerStatus.BENCHED;
}

/**
 * Check if a player with given status should be excluded entirely
 * @param {string} status - Player status
 * @returns {boolean} True if player should be excluded
 */
function shouldExclude(status) {
  return status === PlayerStatus.ABSENT;
}

/**
 * Get priority order for status (higher = more priority for assignment)
 * @param {string} status - Player status
 * @returns {number} Priority value (higher is better)
 */
function getStatusPriority(status) {
  const priorities = {
    [PlayerStatus.CONFIRMED]: 100,
    [PlayerStatus.TENTATIVE]: 50,
    [PlayerStatus.LATE]: 25,
    [PlayerStatus.BENCHED]: 0,
    [PlayerStatus.ABSENT]: -100
  };
  
  return priorities[status] || 0;
}

module.exports = {
  PlayerStatus,
  RAID_HELPER_STATUS_MAP,
  normalizeStatus,
  isValidStatus,
  getValidStatuses,
  isAssignableStatus,
  shouldBench,
  shouldExclude,
  getStatusPriority
};