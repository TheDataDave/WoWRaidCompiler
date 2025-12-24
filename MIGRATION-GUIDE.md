# Migration Guide: Old Optimizer → New Optimizer

## Overview

This guide helps you migrate from the old weight-based optimizer to the new constraint-safe, deterministic optimizer.

## Why Migrate?

### Problems with Old Optimizer
- ❌ Could produce invalid raid compositions
- ❌ Non-deterministic (different results each run)
- ❌ Hard constraints implemented as penalties
- ❌ Difficult to debug when things go wrong
- ❌ Single-pass optimization (local optima)

### Benefits of New Optimizer
- ✅ Always produces valid raid compositions
- ✅ Deterministic (same input = same output)
- ✅ Hard constraints enforced through validation
- ✅ Clear violation reporting for debugging
- ✅ Search-based optimization (better results)
- ✅ Modular and extensible architecture

## Step-by-Step Migration

### Step 1: Update Player Objects

The new optimizer requires players to have a `role` field.

**Old Format:**
```javascript
{
  userid: 'player1',
  name: 'PlayerName',
  class: 'Warrior',
  spec: 'Protection',
  status: 'confirmed'
  // No explicit role field
}
```

**New Format:**
```javascript
{
  userid: 'player1',
  name: 'PlayerName',
  class: 'Warrior',
  spec: 'Protection',
  role: 'tank',  // ← Add this field
  status: 'confirmed'
}
```

**Role Values:**
- `'tank'` - Tank role
- `'healer'` - Healer role
- `'dps'` - DPS role

**Note**: The updated `models.js` automatically derives the role from the player's class if not explicitly provided, so existing code should work without changes.

### Step 2: Normalize Status Values

Ensure all status values use the canonical format.

**Old Status Values (various formats):**
```javascript
'yes', 'confirmed', 'signup', 'accepted'  // All mean confirmed
'maybe', 'tentative', 'uncertain'          // All mean tentative
'late', 'delayed'                          // All mean late
'bench', 'benched', 'backup'               // All mean benched
'no', 'absent', 'declined'                 // All mean absent
```

**New Status Values (canonical):**
```javascript
'confirmed'  // Confirmed attendance
'tentative'  // Tentative attendance
'late'       // Will be late
'benched'    // On bench
'absent'     // Not attending
```

**Note**: The parser automatically normalizes status values, so no code changes needed.

### Step 3: Update Optimizer Calls

Replace old optimizer calls with new optimizer.

**Old Code:**
```javascript
const { optimizeRaid } = require('./optimizer');

const result = optimizeRaid(players);
const groups = result.groups;
const bench = result.bench;
```

**New Code:**
```javascript
const { optimizeRaidComposition } = require('./new-optimizer');

const result = optimizeRaidComposition(players);
if (result.success) {
  const raidState = result.raidState;
  const groups = raidState.groups.map(g => g.getPlayers());
  const bench = raidState.bench;
}
```

**Or use legacy format helper:**
```javascript
const { optimizeRaidLegacy } = require('./new-optimizer');

const result = optimizeRaidLegacy(players);
// Returns result in old format with groups array
```

### Step 4: Update Result Handling

The new optimizer returns more detailed results.

**Old Result Format:**
```javascript
{
  groups: [[player1, player2, ...], ...],
  bench: [player1, player2, ...],
  score: 123.45
}
```

**New Result Format:**
```javascript
{
  success: true,
  raidState: RaidState,  // Immutable state object
  players: [...],         // Original player list
  stats: {
    totalPlayers: 23,
    assigned: 21,
    benched: 1,
    excluded: 1,
    seedScore: 28.25,
    finalScore: 94.54,
    improvement: 66.28,
    iterations: 36,
    timeMs: 944
  },
  scoreBreakdown: {
    classSynergy: {...},
    roleBalance: {...},
    redundancy: {...},
    status: {...},
    bench: {...}
  }
}
```

### Step 5: Update API Endpoints

Update your API endpoints to use the new optimizer.

**Example API Update:**
```javascript
// Old
app.post('/api/optimize', (req, res) => {
  const { players } = req.body;
  const result = optimizeRaid(players);
  res.json(result);
});

// New
app.post('/api/optimize', (req, res) => {
  const { players } = req.body;
  const result = optimizeRaidComposition(players);
  
  if (!result.success) {
    return res.status(400).json({
      error: result.error,
      violations: result.violations
    });
  }
  
  // Convert to legacy format for backward compatibility
  res.json({
    groups: result.raidState.groups.map(g => g.getPlayers()),
    bench: result.raidState.bench,
    score: result.stats.finalScore,
    stats: result.stats
  });
});
```

## Configuration Migration

### Old Configuration
```javascript
const config = {
  minTanks: 2,
  minHealers: 5,
  maxRaidSize: 40,
  weights: {
    tankWeight: 100,
    healerWeight: 80,
    // ... many weights
  }
};
```

### New Configuration
```javascript
const config = {
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
  optimization: {
    maxIterations: 1000,
    maxIterationsWithoutImprovement: 50,
    timeBudgetMs: 5000
  },
  weights: {
    windfuryMeleeBonus: 10,
    shamanHealerDistribution: 5,
    // ... scoring weights
  }
};
```

## Testing Your Migration

### 1. Run the Test Suite
```bash
node test-optimizer.js
```

All tests should pass (7/7).

### 2. Test with Real Data

```javascript
const { optimizeRaidComposition } = require('./new-optimizer');
const { RaidHelperParser } = require('./parser');

// Parse real raid data
const parser = new RaidHelperParser();
const parseResult = parser.parse(raidHelperData);

if (parseResult.success) {
  // Optimize
  const result = optimizeRaidComposition(parseResult.players);
  
  if (result.success) {
    console.log('✓ Optimization successful');
    console.log('  Assigned:', result.stats.assigned);
    console.log('  Benched:', result.stats.benched);
    console.log('  Score:', result.stats.finalScore);
  } else {
    console.log('✗ Optimization failed:', result.error);
  }
}
```

### 3. Compare Results

Run both optimizers on the same data and compare:

```javascript
const oldResult = optimizeRaid(players);
const newResult = optimizeRaidComposition(players);

console.log('Old optimizer score:', oldResult.score);
console.log('New optimizer score:', newResult.stats.finalScore);
console.log('Improvement:', newResult.stats.improvement);
```

## Common Migration Issues

### Issue 1: Players Missing Role Field

**Symptom**: Seed generation fails with "Invalid role" violation

**Solution**: The updated `models.js` automatically derives role from class. Ensure you're using the updated models file.

**Manual Fix**:
```javascript
// Add role to players
players.forEach(player => {
  if (!player.role) {
    player.role = player.roles?.primary || 'dps';
  }
});
```

### Issue 2: Status Values Not Normalized

**Symptom**: Players marked as absent are being assigned to raid

**Solution**: Use the updated parser which automatically normalizes status values.

**Manual Fix**:
```javascript
const { normalizeStatus } = require('./status-enums');

players.forEach(player => {
  player.status = normalizeStatus(player.status);
});
```

### Issue 3: Insufficient Tanks/Healers

**Symptom**: Optimization fails with "Cannot generate valid raid"

**Solution**: This is correct behavior - the old optimizer would have produced an invalid raid. You need more tanks/healers.

**Options**:
1. Adjust minimum requirements in config
2. Add more tanks/healers to the player pool
3. Use the error message to inform users

```javascript
const result = optimizeRaidComposition(players);
if (!result.success) {
  console.log('Cannot create raid:', result.error);
  // Show error to user
}
```

### Issue 4: Different Results Than Old Optimizer

**Symptom**: New optimizer produces different group compositions

**Solution**: This is expected - the new optimizer uses a different algorithm and is deterministic.

**Verification**:
1. Check that the new result is valid (no constraint violations)
2. Compare scores (new should be equal or better)
3. Run multiple times to verify determinism

## Rollback Plan

If you need to rollback to the old optimizer:

1. Keep the old `optimizer.js` file as `optimizer-old.js`
2. Switch imports back to old optimizer
3. File an issue with details about what went wrong

## Performance Comparison

### Old Optimizer
- Speed: ~100-500ms
- Quality: Variable (can produce invalid raids)
- Determinism: No
- Debuggability: Low

### New Optimizer
- Speed: ~500-5000ms (configurable)
- Quality: Always valid, better optimization
- Determinism: Yes
- Debuggability: High (detailed violations)

### Speed Optimization

If the new optimizer is too slow, use quick mode:

```javascript
const { quickOptimizeRaid } = require('./new-optimizer');

const result = quickOptimizeRaid(players);
// Runs in ~500-1000ms
```

## Getting Help

If you encounter issues during migration:

1. Check this guide for common issues
2. Review the test suite: `test-optimizer.js`
3. Read the architecture docs: `NEW-OPTIMIZER-README.md`
4. Check the analysis document: `analysis.md`

## Checklist

- [ ] Updated player objects with `role` field (or using updated models.js)
- [ ] Status values are normalized (or using updated parser.js)
- [ ] Replaced optimizer calls with new optimizer
- [ ] Updated result handling for new format
- [ ] Updated API endpoints
- [ ] Tested with real data
- [ ] All tests passing (7/7)
- [ ] Performance is acceptable
- [ ] Error handling implemented
- [ ] Documentation updated

## Next Steps

After successful migration:

1. Monitor performance in production
2. Collect feedback on raid compositions
3. Tune scoring weights based on feedback
4. Consider adding custom synergy rules
5. Explore advanced features (multi-objective optimization, etc.)