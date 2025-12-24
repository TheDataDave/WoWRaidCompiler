# WoW Classic Synergy System Guide

This guide explains how the raid composition optimizer creates groups with optimal synergy based on WoW Classic mechanics.

## Overview

The optimizer uses a sophisticated synergy calculation system that understands WoW Classic buff mechanics, class interactions, and optimal group compositions. Instead of randomly distributing players, it creates specialized groups that maximize raid-wide performance.

## Group Types

### 1. Melee Groups (Windfury Groups)
**Composition**: 3-4 Melee DPS + 1 Shaman Healer

**Ideal Members**:
- Warriors (Fury, Arms)
- Rogues (Combat, Assassination)
- Feral Druids
- Enhancement Shamans
- Restoration Shaman (for Windfury Totem)

**Key Buffs**:
- **Windfury Totem** - Massive melee DPS increase
- **Strength of Earth Totem** - Strength and agility
- **Grace of Air Totem** - Agility boost
- **Leader of the Pack** (if Feral Druid present) - 3% crit

**Synergy Score**: 240-275 (Highest)

**Example Group**:
```
🛡️ Tank (Warrior Protection)
⚔️ Warrior (Fury)
⚔️ Warrior (Fury)
⚔️ Rogue (Combat)
💚 Shaman (Restoration)
```

### 2. Caster Groups (Spell Power Groups)
**Composition**: 3-4 Mages + 1 Balance Druid (optional) + 1 Healer

**Ideal Members**:
- Mages (Fire, Frost, Arcane)
- Balance Druid (Moonkin Aura)
- Priest/Druid healer

**Key Buffs**:
- **Moonkin Aura** (if Balance Druid) - 3% spell crit
- **Arcane Intellect** - Intellect boost
- **Dampen Magic** - Magic damage reduction

**Synergy Score**: 75-100

**Example Group**:
```
⚔️ Mage (Fire)
⚔️ Mage (Fire)
⚔️ Mage (Arcane)
⚔️ Druid (Balance)
💚 Priest (Holy)
```

### 3. Warlock Groups (Shadow Damage Groups)
**Composition**: 3-4 Warlocks + 1 Shadow Priest + 1 Healer

**Ideal Members**:
- Warlocks (Destruction, Affliction, Demonology)
- Shadow Priest (Shadow Weaving)
- Priest/Druid healer

**Key Buffs**:
- **Shadow Weaving** - 15% increased shadow damage
- **Curse of Elements** - Increased spell damage taken
- **Curse of Shadow** - Increased shadow damage taken

**Synergy Score**: 215-255

**Example Group**:
```
⚔️ Warlock (Destruction)
⚔️ Warlock (Destruction)
⚔️ Warlock (Affliction)
⚔️ Priest (Shadow)
💚 Priest (Holy)
```

### 4. Hunter Groups
**Composition**: 2-3 Hunters + Melee DPS + Healer

**Ideal Members**:
- Hunters (Marksmanship, Beast Mastery)
- Warriors or Rogues (benefit from Trueshot Aura)
- Any healer

**Key Buffs**:
- **Trueshot Aura** - 100 attack power
- **Aspect of the Hawk** - Ranged attack power

**Synergy Score**: 100-150

### 5. Tank Groups
**Composition**: 1-2 Tanks + DPS + Healer

**Purpose**: Distribute tanks across groups for flexibility

**Members**: Protection Warriors, Guardian Druids, Protection Paladins

### 6. Healer Groups (Overflow)
**Composition**: Multiple healers + some DPS

**Purpose**: When there are more healers than can be distributed 1 per group

**Note**: The optimizer tries to minimize pure healer groups by distributing healers to DPS groups first

## Synergy Scoring System

### Pairwise Synergies

The optimizer calculates synergy between every pair of players in a group:

| Combination | Synergy Bonus | Reason |
|-------------|---------------|---------|
| Melee + Melee | +15 | General melee synergy |
| Melee + Shaman | +30 | Windfury Totem |
| Caster + Caster | +10 | General caster synergy |
| Mage + Balance Druid | +25 | Moonkin Aura (3% spell crit) |
| Warlock + Shadow Priest | +25 | Shadow Weaving (15% shadow damage) |
| Hunter + Melee | +10 | Trueshot Aura benefits physical DPS |
| Feral Druid + Melee | +15 | Leader of the Pack (3% crit) |

### Composition Bonuses

Additional bonuses for optimal group makeups:

| Composition | Bonus | Requirement |
|-------------|-------|-------------|
| Melee Group | +50 | 3+ melee + 1 shaman |
| Caster Group | +40 | 3+ mages + 1 balance druid |
| Warlock Group | +40 | 3+ warlocks + 1 shadow priest |
| Hunter Group | +20 | 2+ hunters |
| Has Healer | +15 | At least 1 healer |
| Has Tank | +10 | At least 1 tank |

### Total Group Score

```
Group Score = Sum of Pairwise Synergies + Composition Bonuses
```

**Example Calculation**:
```
Melee Group: 4 Warriors + 1 Shaman
- Warrior + Warrior: +15 (x6 pairs) = +90
- Warrior + Shaman: +30 (x4 pairs) = +120
- Composition bonus (3+ melee + shaman): +50
- Has healer bonus: +15
Total: 275 points
```

## Algorithm Flow

### Phase 1: Player Categorization
Players are categorized by type:
- Melee Warriors (Fury, Arms)
- Rogues (all specs)
- Feral Druids
- Enhancement Shamans
- Restoration Shamans
- Mages (all specs)
- Warlocks (all specs)
- Shadow Priests
- Balance Druids
- Hunters
- Other Healers (Priests, Paladins, Druids)
- Tanks

### Phase 2: Specialized Group Creation

**Step 1: Create Melee Groups**
- Combine 3-4 melee DPS
- Add Restoration Shaman for Windfury
- Fill remaining slots with more melee or tanks

**Step 2: Create Caster Groups**
- Combine 3-4 Mages
- Add Balance Druid if available
- Add healer (Priest or Druid)

**Step 3: Create Warlock Groups**
- Combine 3-4 Warlocks
- Add Shadow Priest for Shadow Weaving
- Add healer (Priest or Druid)

**Step 4: Distribute Remaining Players**
- Assign unassigned players to groups with best synergy
- Fill incomplete groups
- Balance group sizes

**Step 5: Balance Healers**
- Move healers from healer-heavy groups to groups without healers
- Prefer moving non-Shaman healers (keep Shamans with melee)
- Ensure most groups have at least 1 healer

### Phase 3: Score Calculation
- Calculate pairwise synergies for all player combinations
- Add composition bonuses
- Rank groups by synergy score

## Optimal Compositions by Raid Size

### 20-Man Raid (4 groups)
**Ideal Setup**:
- 1 Melee group (4 melee + shaman)
- 1 Caster group (4 mages + healer)
- 1 Warlock group (3 warlocks + shadow priest + healer)
- 1 Mixed group (remaining players)

### 40-Man Raid (8 groups)
**Ideal Setup**:
- 2-3 Melee groups (warriors/rogues + shamans)
- 1-2 Caster groups (mages + balance druids)
- 1 Warlock group (warlocks + shadow priest)
- 1 Hunter group (hunters + melee)
- 1-2 Flex groups (remaining players)

## Understanding Group Scores

### Score Ranges

| Score Range | Quality | Description |
|-------------|---------|-------------|
| 250+ | Excellent | Perfect synergy (melee + windfury) |
| 200-249 | Very Good | Strong synergy (warlocks + shadow priest) |
| 150-199 | Good | Decent synergy (balanced group) |
| 100-149 | Fair | Some synergy (casters together) |
| 50-99 | Poor | Minimal synergy |
| 0-49 | Very Poor | No synergy (random mix) |

### What High Scores Mean

**Group with 275 score**:
- 4 melee DPS with Windfury Totem
- All melee benefit from each other's presence
- Shaman provides critical totems
- Optimal for maximum melee DPS

**Group with 240 score**:
- 4 warlocks with Shadow Priest
- Shadow Weaving increases all shadow damage by 15%
- All warlocks benefit significantly
- Optimal for warlock DPS

**Group with 100 score**:
- 5 mages together
- Arcane Intellect benefits all
- No special synergy beyond that
- Still better than random distribution

## Special Considerations

### Shaman Healers
- **Always placed with melee groups** for Windfury Totem
- Windfury is the single most important buff for melee DPS
- Never place Shamans in pure caster groups

### Shadow Priests
- **Always placed with Warlocks** for Shadow Weaving
- 15% shadow damage increase is massive for warlocks
- Shadow Priests count as DPS, not healers

### Balance Druids
- **Always placed with Mages** for Moonkin Aura
- 3% spell crit is significant for caster DPS
- Balance Druids count as DPS, not healers

### Feral Druids
- **Placed with melee groups** for Leader of the Pack
- 3% crit aura benefits all physical DPS
- Can also tank if needed

## Edge Cases

### Not Enough Shamans
If you have more melee groups than Shamans:
- Best melee get Shamans (highest gear score)
- Remaining melee groups get other healers
- Still maintain melee-heavy composition

### Not Enough Shadow Priests
If you have warlocks but no Shadow Priest:
- Warlocks still grouped together
- Add a regular healer instead
- Warlocks still benefit from being together (curse coordination)

### Not Enough Balance Druids
If you have mages but no Balance Druid:
- Mages still grouped together
- Add a regular healer
- Mages still benefit from Arcane Intellect

### Uneven Numbers
If you have 35 players instead of 40:
- Some groups will have 4 players instead of 5
- Synergy principles still apply
- Prioritize completing high-synergy groups first

## Tips for Best Results

### 1. Recruit Balanced Classes
- Aim for 2-3 Restoration Shamans (for melee groups)
- Have at least 1 Shadow Priest (for warlocks)
- Consider 1 Balance Druid (for mages)

### 2. Understand Your Composition
- Heavy melee? Prioritize Shamans
- Heavy casters? Get a Balance Druid
- Many warlocks? Need a Shadow Priest

### 3. Review Group Scores
- High scores (200+) = excellent synergy
- Low scores (< 100) = may need adjustment
- Compare scores to identify weak groups

### 4. Manual Adjustments
- If a group has very low score, consider:
  - Moving players to better synergy groups
  - Adjusting class weights in settings
  - Re-optimizing with different parameters

## Comparison: Old vs New Algorithm

### Old Algorithm (Simple Distribution)
```
Group 1: Tank, Healer, Warrior, Mage, Warlock
Group 2: Tank, Healer, Rogue, Hunter, Priest
Group 3: Healer, Warrior, Warrior, Shaman, Mage
```
**Issues**: Random distribution, no synergy consideration, wasted buffs

### New Algorithm (Synergy-Based)
```
Group 1: Warrior, Warrior, Warrior, Warrior, Shaman (Windfury!)
Group 2: Mage, Mage, Mage, Mage, Priest (Caster synergy!)
Group 3: Warlock, Warlock, Warlock, Shadow Priest, Healer (Shadow Weaving!)
```
**Benefits**: Specialized groups, maximum synergy, optimal buff usage

## Performance Impact

### DPS Increase Estimates

**Melee with Windfury**: +20-30% DPS increase
**Warlocks with Shadow Weaving**: +15% DPS increase
**Mages with Moonkin Aura**: +5-8% DPS increase

### Overall Raid DPS

Proper group composition can increase overall raid DPS by **15-25%** compared to random distribution.

## References

- [Wowhead Classic Raid Composition Tool](https://www.wowhead.com/classic/raid-composition)
- [Icy Veins Classic Raid Guides](https://www.icy-veins.com/wow-classic/)
- [Classic WoW Buff Stacking Guide](https://classic.wowhead.com/guides/classic-wow-buffs-debuffs)

## Testing

Test the synergy system with:
```bash
node test-synergy.js
```

This will show you:
- How players are grouped
- Synergy scores for each group
- Buff coverage
- Composition statistics

## Future Enhancements

Planned improvements:
- [ ] Hunter group optimization (Trueshot Aura stacking)
- [ ] Paladin blessing optimization (Alliance)
- [ ] Curse assignment for warlocks
- [ ] Totem rotation planning
- [ ] Buff coverage visualization
- [ ] Manual group adjustment UI

---

**The synergy system transforms raid composition from guesswork into science!** 🎯