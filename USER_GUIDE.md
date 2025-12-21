# WoW Classic Raid Composition Optimizer - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Step-by-Step Workflow](#step-by-step-workflow)
4. [Understanding the Algorithm](#understanding-the-algorithm)
5. [Tips & Best Practices](#tips--best-practices)
6. [FAQ](#faq)

## Getting Started

### First Launch

When you first launch the application, you'll see four main tabs:
- **📁 Upload**: Import your raid signup data
- **⚙️ Settings**: Configure optimization parameters
- **🎯 Composition**: View and optimize your raid
- **💾 Export**: Save and share your results

### Quick Start (3 Steps)

1. **Upload** → Select your Raid Helper JSON file
2. **Composition** → Click "Optimize Composition"
3. **Export** → Save or copy your results

That's it! The optimizer will create balanced groups automatically.

## Interface Overview

### Upload Tab

**Purpose**: Import raid signup data from Raid Helper

**Features**:
- Drag-and-drop or click to select JSON file
- Automatic validation of data format
- Summary display showing:
  - Total signups
  - Confirmation status breakdown
  - Role distribution (tanks, healers, DPS)
  - Class distribution

**What You'll See**:
```
Total Players: 25
Status:
  ✅ Confirmed: 23
  ❓ Tentative: 2
  🪑 Benched: 0
Roles:
  🛡️ Tanks: 3
  💚 Healers: 9
  ⚔️ DPS: 13
```

### Settings Tab

**Purpose**: Configure optimization parameters and API credentials

#### Battle.net API Section
- **Client ID**: Your Battle.net API client ID
- **Client Secret**: Your Battle.net API secret key
- **Region**: Select your game region (US, EU, KR, TW)

#### Raid Configuration Section
- **Raid Size**: Choose from 5, 10, 20, 25, or 40-man
- **Faction**: 
  - Neutral: All classes available
  - Alliance: No Shamans
  - Horde: No Paladins

#### Role Thresholds Section
- **Healer Percentage**: Target % of raid as healers (default: 25%)
- **Minimum Tanks**: Minimum tanks required (default: 2)

#### Class Priority Weights Section
Adjust importance of each class (0-10 scale):
- **Higher values** = Higher selection priority
- **Lower values** = Lower priority, may be benched
- Default values are balanced for most content

**Recommended Weights**:
- **Shamans (Horde)**: 7-8 (Windfury, totems)
- **Paladins (Alliance)**: 6-7 (Blessings, utility)
- **Priests**: 6 (Essential healing, buffs)
- **Warriors**: 5 (Tanks and DPS)
- **Mages/Warlocks/Hunters**: 5 (Solid DPS)
- **Rogues**: 4 (Pure DPS, less utility)
- **Druids**: 5 (Versatile, good utility)

### Composition Tab

**Purpose**: Optimize and view your raid composition

#### Action Buttons
- **🎯 Optimize Composition**: Run the optimization algorithm
- **📊 Fetch Gear Scores**: Get current gear scores from Battle.net API

#### View Options
- **Vertical View**: Groups stacked vertically (better for detailed review)
- **Horizontal View**: Groups side-by-side (better for overview)

#### Group Display
Each group shows:
- Group number and total score
- Role distribution (tanks, healers, DPS)
- Player cards with:
  - Character name
  - Class and spec
  - Role badge
  - Gear score
  - Optimization score

#### Statistics Panel
- Total players selected
- Role breakdown
- Average gear score
- Number of groups
- Average group score
- Unique buffs covered

### Export Tab

**Purpose**: Save and share your optimized composition

#### Export Options

**📄 JSON Export**
- Complete data structure
- Includes all metadata
- Best for: Data processing, archiving, re-importing

**📊 CSV Export**
- Spreadsheet-compatible format
- Columns: Group, Name, Class, Spec, Role, Gear Score, Score, Status
- Best for: Excel analysis, Google Sheets, data manipulation

**📋 Copy to Clipboard**
- Formatted text output
- Includes group headers and player details
- Best for: Discord announcements, forum posts, quick sharing

#### Preview Section
Shows formatted text output before exporting

## Step-by-Step Workflow

### Scenario: Organizing a 40-Man Molten Core Raid

#### Step 1: Gather Signups (Outside Application)
- Create raid event in Discord using Raid Helper
- Collect signups from guild members
- Export signup data to JSON

#### Step 2: Import Data
1. Launch WoW Raid Optimizer
2. Go to **Upload** tab
3. Click "Select File"
4. Choose your Raid Helper JSON export
5. Review the summary:
   - Check total signups (should be 40+)
   - Verify role distribution looks reasonable
   - Note any class imbalances

#### Step 3: Configure Settings
1. Go to **Settings** tab
2. Set **Raid Size** to 40
3. Set **Faction** to your faction (Horde/Alliance)
4. Adjust **Healer Percentage** to 25% (10 healers for 40-man)
5. Set **Minimum Tanks** to 3
6. Adjust class weights if needed:
   - Increase Shaman weight for Horde (Windfury groups)
   - Increase Paladin weight for Alliance (Blessings)
7. Click "Save Settings"

#### Step 4: Fetch Gear Scores (Optional)
1. If you have Battle.net API credentials configured
2. Go to **Composition** tab
3. Click "Fetch Gear Scores"
4. Wait for API to retrieve data (40-60 seconds for 40 players)
5. Review gear scores in the status message

#### Step 5: Optimize Composition
1. Still in **Composition** tab
2. Click "Optimize Composition"
3. Wait 2-3 seconds for algorithm to complete
4. Review the results:
   - Check you have 8 groups (40 players ÷ 5 per group)
   - Verify role distribution meets requirements
   - Look at group scores (higher = better synergy)

#### Step 6: Review Groups
1. Switch between Vertical and Horizontal views
2. For each group, check:
   - Has at least 1 healer (ideally 1-2)
   - Has good DPS mix
   - Has buff diversity
3. Note the group scores:
   - Groups 1-3 should have highest scores (main raid)
   - Groups 4-8 may have lower scores (still viable)

#### Step 7: Analyze Statistics
1. Scroll to Statistics panel
2. Verify:
   - Total players = 40
   - Tanks = 3-5
   - Healers = 8-12
   - DPS = 23-29
   - Average gear score is reasonable
   - Good buff coverage (15+ unique buffs)

#### Step 8: Export Results
1. Go to **Export** tab
2. Review the preview
3. Choose export method:
   - **JSON**: For record-keeping
   - **CSV**: For spreadsheet analysis
   - **Clipboard**: For Discord announcement

#### Step 9: Announce to Guild
Example Discord message (from clipboard):
```
@Raid Team - MC Raid Composition

GROUP 1 (Main Tank Group)
🛡️ Thunderfury - Warrior - Protection - GS: 450
💚 Holybolt - Priest - Holy - GS: 420
⚔️ Frostmage - Mage - Frost - GS: 410
⚔️ Shadowlock - Warlock - Destruction - GS: 405
⚔️ Huntmaster - Hunter - Marksmanship - GS: 400

[... continue for all groups ...]

Raid starts at 7:00 PM server time. Be online 15 minutes early!
```

## Understanding the Algorithm

### How Players Are Scored

The optimizer assigns each player a score based on multiple factors:

#### 1. Gear Score (50% weight)
- Higher gear = higher priority
- Fetched from Battle.net API or manually entered
- Ensures best-geared players are selected first

#### 2. Class Weight (Configurable)
- Set in Settings tab
- Multiplied by 10 for scoring
- Allows prioritizing certain classes

#### 3. Role Scarcity Bonus
- **Tanks needed**: +100 points
- **Healers needed**: +80 points
- Ensures minimum role requirements are met

#### 4. Buff Diversity Bonus
- +5 points per unique buff provided
- Shamans, Paladins, Druids get extra value
- Encourages class diversity

#### 5. Utility Class Bonus
- Shaman, Paladin, Druid: +20 points
- Rewards classes with raid-wide benefits

#### 6. Confirmation Status
- Confirmed: +30 points
- Tentative: +10 points
- Unsigned: 0 points
- Prioritizes reliable players

### How Groups Are Formed

#### Phase 1: Player Selection
1. Filter by faction (remove Shamans for Alliance, Paladins for Horde)
2. Remove benched players
3. Score all remaining players
4. Sort by score (highest first)
5. Select players ensuring role minimums:
   - First pass: Select minimum tanks
   - Second pass: Select minimum healers
   - Third pass: Fill remaining slots with highest-scored players

#### Phase 2: Group Distribution
1. Create groups (raid size ÷ 5)
2. Distribute key roles evenly:
   - Tanks spread across groups
   - Healers spread across groups
3. Fill remaining slots with DPS
4. Balance group sizes

#### Phase 3: Group Scoring
Each group is scored based on:
- Sum of player scores
- Buff diversity (+10 per unique buff)
- Role balance bonuses:
  - Has tank: +20
  - Has healer: +20
  - Has 3+ DPS: +15

### Role Thresholds by Raid Size

The optimizer uses these guidelines:

**5-Man Dungeons**
- Tanks: 1 (fixed)
- Healers: 1 (fixed)
- DPS: 3 (fixed)

**10-Man Raids**
- Tanks: 1-2
- Healers: 2-3 (20-30%)
- DPS: 5-7

**20-Man Raids** (ZG, AQ20)
- Tanks: 2-3
- Healers: 4-6 (20-30%)
- DPS: 11-14

**25-Man Raids** (Karazhan)
- Tanks: 2-3
- Healers: 5-7 (20-28%)
- DPS: 15-18

**40-Man Raids** (MC, BWL, AQ40, Naxx)
- Tanks: 3-5
- Healers: 8-12 (20-30%)
- DPS: 23-29

## Tips & Best Practices

### Before Optimization

✅ **DO**:
- Collect signups well in advance
- Verify all player names are spelled correctly
- Confirm player availability
- Set realistic raid size (don't overcommit)
- Configure faction correctly

❌ **DON'T**:
- Wait until last minute to organize
- Assume all signups will show up
- Ignore class balance warnings
- Set unrealistic healer percentages

### During Optimization

✅ **DO**:
- Review the statistics after optimization
- Check that role requirements are met
- Verify buff coverage is adequate
- Look at group scores for balance
- Consider re-optimizing with different settings

❌ **DON'T**:
- Accept first result without review
- Ignore low group scores
- Overlook missing key buffs
- Forget to save your composition

### After Optimization

✅ **DO**:
- Export results for records
- Announce composition to raid team
- Prepare backup players
- Share group assignments clearly
- Keep composition accessible during raid

❌ **DON'T**:
- Make last-minute changes without re-optimizing
- Forget to communicate with benched players
- Lose track of your composition
- Ignore player feedback

### Optimization Tips

**For Balanced Results**:
- Use default class weights
- Set healer % to 25%
- Let algorithm handle distribution

**For Specific Strategies**:
- Increase Shaman weight for melee-heavy groups (Horde)
- Increase Mage weight for AoE-heavy content
- Increase Warlock weight for curse requirements
- Adjust healer % based on encounter difficulty

**For Undergeared Raids**:
- Increase healer % to 30%
- Increase tank minimum to 4-5
- Prioritize utility classes
- Fetch gear scores to identify weak spots

**For Farm Content**:
- Decrease healer % to 20%
- Increase DPS class weights
- Focus on speed over safety
- Consider bringing more AoE classes

## FAQ

### General Questions

**Q: Do I need Battle.net API credentials?**
A: No, they're optional. The optimizer works without gear scores, but having them improves accuracy.

**Q: Can I manually adjust the composition?**
A: Currently, the optimizer is automatic only. Manual editing is planned for future versions. You can re-optimize with different settings to get different results.

**Q: How long does optimization take?**
A: Usually 1-3 seconds for any raid size. Gear score fetching takes longer (100ms per character).

**Q: Can I save multiple compositions?**
A: Currently one at a time. You can export to JSON and re-import later.

**Q: Does this work for retail WoW?**
A: Currently optimized for Classic. Retail support is planned for future versions.

### Technical Questions

**Q: What data does the app collect?**
A: None. All data stays on your computer. Only Battle.net API calls go external (for gear scores).

**Q: Can I use this offline?**
A: Yes, except for the gear score fetching feature which requires internet.

**Q: What file formats are supported?**
A: Import: Raid Helper JSON. Export: JSON, CSV, plain text.

**Q: Can I customize the algorithm?**
A: Yes, through class weights and role thresholds in Settings.

**Q: Is the source code available?**
A: Yes, the application is open source. Check the project repository.

### Troubleshooting

**Q: Why are some players benched?**
A: The optimizer selects the best players for the raid size. Benched players either:
- Have lower scores
- Don't fit role requirements
- Are marked as benched in the data
- Exceed the raid size limit

**Q: Why is the composition unbalanced?**
A: Check your settings:
- Verify raid size is correct
- Adjust healer percentage
- Review class weights
- Ensure enough signups for each role

**Q: Why can't I fetch gear scores?**
A: Common issues:
- Missing API credentials
- Incorrect character names
- Wrong realm
- API rate limiting
- Character doesn't exist on Battle.net

**Q: Why is a group score low?**
A: Low scores indicate:
- Missing key roles (no healer/tank)
- Low gear scores
- Poor buff coverage
- Fewer utility classes
- This is normal for later groups in large raids

### Best Practices

**Q: How many healers should I bring?**
A: General guidelines:
- Farm content: 20-22%
- Progression: 25-28%
- Hard content: 28-32%
- Adjust based on your raid's skill level

**Q: Should I prioritize gear score or class balance?**
A: Both matter:
- Gear score ensures performance
- Class balance ensures buffs/utility
- The optimizer balances both automatically

**Q: How do I handle late signups?**
A: Options:
1. Re-import updated JSON and re-optimize
2. Manually swap players (note changes)
3. Keep backup players ready

**Q: What if I have too many of one class?**
A: Options:
1. Increase that class's weight (if they're good)
2. Decrease that class's weight (if you want variety)
3. Accept the imbalance if they're your best players
4. Recruit more diverse classes for future raids

---

**Need more help?** Check the README.md and SETUP_GUIDE.md for additional information.

Happy raiding! ⚔️🛡️💚