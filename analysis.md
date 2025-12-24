# Current Implementation Analysis

## Key Findings from Code Review

### 1. Parser Issues (parser.js)
**Status Mapping Problems:**
- Current parser uses simple string matching for status
- No normalization of raid-helper status strings
- Status field may not align with optimizer expectations
- Missing explicit enum mapping for: confirmed, tentative, late, benched, absent

**Current Status Handling:**
```javascript
// In parseRaidHelperData - status is taken directly from signup
status: signup.status || 'confirmed'
```

**Issues:**
- No validation of status values
- No mapping from raid-helper format to internal enums
- Default to 'confirmed' may hide data issues

### 2. Optimizer Issues (optimizer.js)

**Current Approach:**
- Uses soft constraints via weighted scoring
- Single-pass optimization with in-place mutations
- Hard rules implemented as negative weights (anti-pattern)
- No explicit constraint validation before scoring
- Non-deterministic due to random elements

**Key Problems Identified:**
```javascript
// Scoring happens on potentially invalid states
function scoreRaidComposition(groups) {
  // Mixes hard constraints with soft preferences
  // Uses negative weights to "enforce" rules
}
```

**Constraint Handling:**
- Tank/healer requirements handled via penalties, not validation
- Group size violations scored negatively instead of rejected
- No separation between "invalid" and "suboptimal"

### 3. Global Optimizer Issues (global-optimizer.js)

**Current Approach:**
- Attempts to optimize across multiple raids simultaneously
- Uses similar soft-constraint approach
- Complex cross-raid balancing logic
- Difficult to reason about correctness

**Issues:**
- No guarantee of valid individual raids
- Optimization can produce constraint violations
- Hard to debug when things go wrong

### 4. Models (models.js)

**Current State:**
- Basic class definitions for Player, Group, Raid
- Mutable structures
- No immutability guarantees
- No built-in validation

**Missing:**
- Immutable state model
- State cloning utilities
- Constraint validation methods
- Clear separation of concerns

### 5. Synergy System (synergy.js)

**Current Implementation:**
- Hardcoded synergy rules
- Mixed with constraint logic
- Not extensible for new synergies

**Good Aspects:**
- Already has some class synergy logic
- Can be adapted for new scoring system

## Critical Issues to Address

### Priority 1: Parser Status Mapping
- Normalize all status strings
- Create explicit enum mapping
- Validate status values
- Ensure optimizer receives correct data

### Priority 2: Constraint Validation
- Separate hard constraints from scoring
- Create explicit validator functions
- Reject invalid states immediately
- No scoring of invalid states

### Priority 3: Immutable State Model
- Implement copy-on-write semantics
- Enable safe state exploration
- Support rollback and comparison
- Make debugging easier

### Priority 4: Deterministic Optimization
- Remove random elements
- Use consistent ordering
- Ensure reproducible results
- Enable testing and validation

## Refactor Strategy

### Step 1: Fix Data Layer (parser.js)
1. Add status normalization function
2. Map raid-helper strings to internal enums
3. Validate all player data
4. Add tests for parser output

### Step 2: Build State Model (new file: state-model.js)
1. Implement immutable Raid/Group/Slot/Player
2. Add cloning utilities
3. Add state comparison utilities
4. Add state validation utilities

### Step 3: Create Constraint System (new file: constraints.js)
1. Define all hard constraints
2. Implement validator functions
3. Add violation reporting
4. Separate from scoring completely

### Step 4: Build Greedy Seed (new file: seed-generator.js)
1. Implement role-priority placement
2. Ensure valid output or fail loudly
3. No optimization logic
4. Deterministic ordering

### Step 5: Implement Search Optimizer (new file: search-optimizer.js)
1. Generate neighbor states via swaps
2. Validate all neighbors
3. Score only valid states
4. Keep best valid state
5. Implement stopping conditions

### Step 6: Refactor Scoring (update: synergy.js or new scoring.js)
1. Remove all constraint logic
2. Only evaluate valid states
3. Implement additive scoring
4. Make weights configurable
5. Add class synergy logic

### Step 7: Integration
1. Update optimizer.js to use new system
2. Update global-optimizer.js if needed
3. Update API endpoints
4. Add comprehensive tests

## Next Steps

1. Start with parser fixes (immediate impact)
2. Build state model (foundation for everything)
3. Implement constraints (safety first)
4. Build greedy seed (valid starting point)
5. Add search optimization (quality improvement)
6. Refactor scoring (preferences only)
7. Integrate and test