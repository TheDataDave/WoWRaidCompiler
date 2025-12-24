# New Raid Optimizer - Architecture Documentation

## Overview

The new raid optimizer is a complete redesign that replaces the old soft-constraint, weight-based approach with a deterministic, constraint-safe, search-based system. This ensures that all raid compositions are valid before optimization and that results are reproducible.

## Core Principles

1. **Validity Before Quality**: Generate valid raid compositions first, then optimize for quality
2. **Constraints Not Penalties**: Hard rules are enforced through validation, not negative weights
3. **Search Not Single-Pass**: Use local search to explore the solution space systematically
4. **Scoring Only on Valid States**: Never score invalid raid compositions

## Architecture Components

### 1. Status Enums (`status-enums.js`)

**Purpose**: Centralized status normalization and validation

**Key Features**:
- Canonical status values: `confirmed`, `tentative`, `late`, `benched`, `absent`
- Mapping from raid-helper status strings to internal enums
- Status priority for assignment ordering
- Helper functions for status checks

**Usage**:
```javascript
const { normalizeStatus, isAssignableStatus } = require('./status-enums');

const status = normalizeStatus('yes'); // Returns 'confirmed'
const canAssign = isAssignableStatus(status); // Returns true
```

### 2. State Model (`state-model.js`)

**Purpose**: Immutable data structures for raid compositions

**Key Classes**:
- `Slot`: Represents a single position in a group
- `Group`: Represents a raid group (typically 5 players)
- `RaidState`: Represents the complete raid composition

**Key Features**:
- Immutable - all mutations create new instances
- Safe state exploration during optimization
- Easy rollback and comparison
- JSON serialization support

**Usage**:
```javascript
const { RaidState } = require('./state-model');

// Create empty raid
const state = RaidState.createEmpty(8, 5);

// Add player (creates new state)
const newState = state.withPlayerAt(1, 0, player);

// Original state unchanged
console.log(state.getTotalPlayerCount()); // 0
console.log(newState.getTotalPlayerCount()); // 1
```

### 3. Constraints (`constraints.js`)

**Purpose**: Hard constraint validation system

**Constraint Levels**:
- **Raid-level**: Total size, minimum tanks/healers, no duplicates
- **Group-level**: Group size, role caps per group, no duplicates
- **Player-level**: Valid status, valid role, valid class

**Key Features**:
- Binary pass/fail validation (no penalties)
- Detailed violation reporting
- Configurable constraint values
- Swap validation before execution

**Usage**:
```javascript
const { validateRaidState, isValidRaidState } = require('./constraints');

const validation = validateRaidState(raidState);
if (!validation.valid) {
  console.log('Violations:', validation.getViolationMessages());
}
```

### 4. Seed Generator (`seed-generator.js`)

**Purpose**: Generate valid starting raid compositions

**Algorithm**:
1. Filter assignable players (exclude absent/benched)
2. Sort by priority (role > status > signup time)
3. Place tanks first
4. Place healers second
5. Fill remaining slots with DPS
6. Bench overflow players

**Key Features**:
- Deterministic output (same input = same output)
- Fast generation (no optimization)
- Guaranteed validity or loud failure
- Role-aware placement

**Usage**:
```javascript
const { generateSeed } = require('./seed-generator');

const result = generateSeed(players);
if (result.success) {
  console.log('Valid seed generated:', result.stats);
  const raidState = result.raidState;
}
```

### 5. Search Optimizer (`search-optimizer.js`)

**Purpose**: Improve valid raid compositions using local search

**Techniques**:
- Pairwise player swaps
- Role-preserving swaps only
- Constraint validation for all neighbors
- Hill-climbing with best neighbor selection

**Stopping Conditions**:
- Maximum iterations reached
- No improvement for N iterations
- Time budget exceeded

**Key Features**:
- Only explores valid states
- Deterministic (no random elements)
- Configurable search parameters
- Multiple optimization modes (quick/deep)

**Usage**:
```javascript
const { optimize } = require('./search-optimizer');
const { scoreRaidComposition } = require('./scoring');

const result = optimize(seedState, scoreRaidComposition, {
  maxIterations: 1000,
  maxIterationsWithoutImprovement: 50,
  timeBudgetMs: 5000
});

console.log('Improvement:', result.improvement);
```

### 6. Scoring System (`scoring.js`)

**Purpose**: Evaluate quality of valid raid compositions

**Scoring Categories**:
- **Class Synergy**: Windfury totems, shaman healers, paladin buffs
- **Role Balance**: Even healer spread, tank support coverage
- **Redundancy Penalties**: Too many same class, too many ranged
- **Status Preferences**: Minimize late/tentative players
- **Bench Preferences**: Minimize benching

**Key Features**:
- Only scores valid states
- Additive scoring model
- Configurable weights
- Detailed score breakdown

**Usage**:
```javascript
const { scoreRaidComposition, getScoreBreakdown } = require('./scoring');

const score = scoreRaidComposition(raidState);
const breakdown = getScoreBreakdown(raidState);

console.log('Total score:', score);
console.log('Class synergy:', breakdown.classSynergy);
```

### 7. Main Optimizer (`new-optimizer.js`)

**Purpose**: Integration module that ties everything together

**Workflow**:
1. Validate input players
2. Check if seed generation is possible
3. Generate valid seed composition
4. Optimize seed using local search
5. Validate final result
6. Return optimized raid state

**Key Functions**:
- `optimizeRaidComposition()`: Standard optimization
- `quickOptimizeRaid()`: Fast optimization (1 second)
- `deepOptimizeRaid()`: Thorough optimization (30 seconds)
- `analyzeRaidComposition()`: Detailed analysis of a raid

**Usage**:
```javascript
const { optimizeRaidComposition } = require('./new-optimizer');

const result = optimizeRaidComposition(players);
if (result.success) {
  console.log('Optimization complete!');
  console.log('Final score:', result.stats.finalScore);
  console.log('Improvement:', result.stats.improvement);
  console.log('Time:', result.stats.timeMs, 'ms');
}
```

## Configuration

### Default Configuration

```javascript
{
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
}
```

### Customizing Configuration

```javascript
const result = optimizeRaidComposition(players, {
  seed: {
    raid: {
      MIN_TANKS: 3, // Require 3 tanks instead of 2
      MIN_HEALERS: 6 // Require 6 healers instead of 5
    }
  },
  weights: {
    windfuryMeleeBonus: 20, // Increase windfury importance
    benchingPenalty: -5 // Increase benching penalty
  }
});
```

## Testing

### Running Tests

```bash
node test-optimizer.js
```

### Test Coverage

1. **Status Normalization**: Validates status string mapping
2. **State Immutability**: Ensures state modifications create new instances
3. **Constraint Validation**: Tests all constraint rules
4. **Seed Generation**: Validates seed creation
5. **Optimization Determinism**: Ensures reproducible results
6. **Scoring System**: Tests scoring calculations
7. **Full Optimization**: End-to-end integration test

### Test Results

All 7 tests passing:
- ✓ Status Normalization (11/11 cases)
- ✓ State Immutability
- ✓ Constraint Validation
- ✓ Seed Generation
- ✓ Optimization Determinism
- ✓ Scoring System
- ✓ Full Optimization

## Performance

### Benchmarks

- **Seed Generation**: ~10-50ms for 40 players
- **Quick Optimization**: ~500-1000ms
- **Standard Optimization**: ~1-5 seconds
- **Deep Optimization**: ~10-30 seconds

### Optimization Results

Example with 23 players:
- Seed score: 28.25
- Final score: 94.54
- Improvement: 66.28 points (235% increase)
- Iterations: 36
- Time: 944ms

## Migration from Old Optimizer

### Key Differences

| Old Optimizer | New Optimizer |
|--------------|---------------|
| Soft constraints via weights | Hard constraints via validation |
| Single-pass optimization | Search-based optimization |
| Non-deterministic | Deterministic |
| Can produce invalid raids | Always produces valid raids |
| Difficult to debug | Clear violation reporting |

### Migration Steps

1. Update player objects to include `role` field
2. Ensure status values are normalized
3. Replace optimizer calls:
   ```javascript
   // Old
   const result = optimizeRaid(players);
   
   // New
   const result = optimizeRaidComposition(players);
   ```
4. Update result handling (new format includes more metadata)

### Backward Compatibility

The new optimizer includes a `convertToLegacyFormat()` function for compatibility:

```javascript
const { optimizeRaidLegacy } = require('./new-optimizer');

const result = optimizeRaidLegacy(players);
// Returns result in old format with groups array
```

## Future Enhancements

### Planned Features

1. **Multi-objective Optimization**: Balance multiple goals simultaneously
2. **Custom Synergy Rules**: User-defined class synergies
3. **Historical Data Integration**: Learn from past raid compositions
4. **Real-time Optimization**: Update compositions as players sign up
5. **Alternative Solutions**: Generate multiple valid compositions

### Extensibility

The modular architecture makes it easy to add new features:

- **New Constraints**: Add to `constraints.js`
- **New Scoring Rules**: Add to `scoring.js`
- **New Search Strategies**: Add to `search-optimizer.js`
- **New Status Types**: Add to `status-enums.js`

## Troubleshooting

### Common Issues

**Issue**: Seed generation fails with "Not enough tanks"
- **Solution**: Ensure players have correct `role` field set
- **Check**: Verify tank players are not marked as absent/benched

**Issue**: Optimization produces same result as seed
- **Solution**: Increase iteration count or time budget
- **Check**: Verify scoring weights are configured correctly

**Issue**: Final state is invalid
- **Solution**: This should never happen - report as bug
- **Workaround**: System automatically falls back to seed state

### Debug Mode

Enable logging for detailed optimization trace:

```javascript
const result = optimizeRaidComposition(players, {
  optimization: {
    enableLogging: true
  }
});
```

## Support

For issues, questions, or contributions:
- Review test suite: `test-optimizer.js`
- Check analysis document: `analysis.md`
- Review design specification: `raid_optimizer_redesign`

## License

Part of the NinjaTech AI Raid Composition Tool