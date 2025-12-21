# WoW Classic Raid Composition Optimizer

A powerful Electron-based desktop application that optimizes World of Warcraft Classic raid compositions using Raid Helper JSON exports and Battle.net API integration.

## Features

### 🎯 Core Functionality
- **Raid Helper Integration**: Import raid signups directly from Raid Helper JSON exports
- **Battle.net API**: Automatically fetch real-time gear scores for all players
- **Smart Optimization**: Advanced algorithm that considers:
  - Role requirements (tanks, healers, DPS)
  - Class synergies and buffs
  - Gear scores and player performance
  - Faction restrictions (Alliance/Horde)
  - Custom priority weights

### 📊 Composition Analysis
- Automatic group formation with optimal synergy
- Buff coverage analysis
- Role distribution statistics
- Class balance recommendations
- Average gear score calculations

### 💾 Export Options
- JSON export for data processing
- CSV export for spreadsheets
- Formatted text output for Discord/forums
- Copy to clipboard functionality

### ⚙️ Customization
- Configurable raid sizes (5, 10, 20, 25, 40-man)
- Faction selection (Alliance, Horde, Neutral)
- Adjustable healer percentages
- Custom class priority weights
- Minimum tank requirements

## Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager

### Setup Steps

1. **Clone or extract the application**
   ```bash
   cd wow-classic-raid-optimizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

### Building for Distribution

To create a distributable package:

```bash
npm run build
```

This will create installers in the `dist` folder for your platform.

## Battle.net API Setup

To use the gear score fetching feature, you need Battle.net API credentials:

1. Go to https://develop.battle.net/
2. Create a new application
3. Note your Client ID and Client Secret
4. Enter these credentials in the Settings tab of the application

## Usage Guide

### 1. Import Raid Data

**Upload Tab:**
- Click "Select File" to choose your Raid Helper JSON export
- The application will parse and display a summary of signups
- View breakdown by class, role, and status

### 2. Configure Settings

**Settings Tab:**
- **Battle.net API**: Enter your Client ID and Client Secret
- **Raid Configuration**: 
  - Select raid size (5, 10, 20, 25, or 40-man)
  - Choose faction (affects class availability)
  - Set healer percentage
  - Configure minimum tanks
- **Class Weights**: Adjust priority for each class (0-10 scale)
- Click "Save Settings" to persist your configuration

### 3. Optimize Composition

**Composition Tab:**
- Click "Fetch Gear Scores" to retrieve current gear scores from Battle.net (optional)
- Click "Optimize Composition" to run the algorithm
- View optimized groups with:
  - Player assignments
  - Role distribution
  - Gear scores
  - Synergy scores
- Toggle between vertical and horizontal group views

### 4. Export Results

**Export Tab:**
- **JSON Export**: Save complete composition data
- **CSV Export**: Export to spreadsheet format
- **Copy to Clipboard**: Get formatted text for sharing
- Preview the formatted output before exporting

## Raid Helper JSON Format

The application expects JSON in the following format:

```json
{
  "_id": "raid_id",
  "partyPerRaid": 8,
  "slotPerParty": 5,
  "raidDrop": [
    {
      "userid": "user_id",
      "name": "PlayerName",
      "class": "Warrior",
      "spec": "Protection",
      "spec1": "Protection",
      "signuptime": 1699564800000,
      "isConfirmed": true,
      "note": "Main tank",
      "partyId": 1,
      "slotId": 1
    }
  ]
}
```

### Required Fields
- `name`: Player character name
- `class`: WoW class (Warrior, Priest, Mage, etc.)
- `spec`: Specialization

### Optional Fields
- `userid`: Unique player identifier
- `signuptime`: Timestamp of signup
- `isConfirmed`: Confirmation status
- `note`: Player notes
- `partyId`, `slotId`: Original group assignments

## Algorithm Details

### Player Scoring
The optimizer scores each player based on:

1. **Gear Score** (50% weight): Higher gear = higher priority
2. **Class Weight** (configurable): Adjust importance of each class
3. **Role Scarcity**: Bonus for needed roles (tanks, healers)
4. **Buff Diversity**: Bonus for unique buffs/utilities
5. **Confirmation Status**: Confirmed players get priority

### Group Formation
Groups are formed to maximize:

- **Role Balance**: Ideal tank/healer/DPS ratios
- **Buff Coverage**: Diverse buffs across groups
- **Synergy**: Classes that work well together
- **Even Distribution**: Balanced power across all groups

### Role Thresholds

**5-Man Dungeons:**
- Tanks: 1
- Healers: 1
- DPS: 3

**20-Man Raids:**
- Tanks: 2-3
- Healers: 4-6
- DPS: 11-14

**40-Man Raids:**
- Tanks: 3-5
- Healers: 8-12
- DPS: 23-29

## Class Roles & Buffs

### Tanks
- **Warrior**: Main tank, off-tank
- **Druid**: Feral tank (hybrid)
- **Paladin**: Off-tank, utility

### Healers
- **Priest**: Holy, Discipline
- **Druid**: Restoration
- **Shaman**: Restoration (Horde)
- **Paladin**: Holy (Alliance)

### DPS
- **Warrior**: Fury, Arms
- **Rogue**: Combat, Assassination
- **Hunter**: All specs
- **Mage**: All specs
- **Warlock**: All specs
- **Priest**: Shadow
- **Druid**: Balance, Feral
- **Shaman**: Enhancement, Elemental
- **Paladin**: Retribution

### Key Buffs
- **Shaman**: Windfury Totem, Strength of Earth, Grace of Air
- **Paladin**: Blessings (Kings, Might, Wisdom)
- **Druid**: Mark of the Wild, Innervate
- **Priest**: Fortitude, Divine Spirit, Shadow Weaving
- **Mage**: Arcane Intellect
- **Warlock**: Healthstones, Curses
- **Hunter**: Trueshot Aura

## Troubleshooting

### Battle.net API Issues
- **Authentication Failed**: Verify Client ID and Secret are correct
- **Character Not Found**: Check character name spelling and realm
- **Rate Limiting**: The app includes automatic rate limiting (100ms between requests)

### Import Issues
- **Parsing Errors**: Ensure JSON is valid Raid Helper format
- **Missing Fields**: Check that required fields (name, class, spec) are present
- **Invalid Classes**: Class names must match WoW class names exactly

### Performance
- Large raids (40-man) may take a few seconds to optimize
- Gear score fetching is rate-limited to avoid API throttling
- Consider using cached gear scores for repeated optimizations

## Sample Data

A sample Raid Helper JSON file is included in `sample-data/raid-helper-sample.json` for testing purposes.

## Technical Details

### Built With
- **Electron**: Cross-platform desktop framework
- **Node.js**: Backend runtime
- **Vanilla JavaScript**: No framework dependencies for renderer
- **Battle.net API**: Real-time character data

### Architecture
- **Main Process**: Electron main, IPC handlers, file operations
- **Renderer Process**: UI, user interactions, visualization
- **Core Modules**:
  - `models.js`: Data structures (Player, Raid, Group)
  - `optimizer.js`: Composition algorithm
  - `parser.js`: JSON parsing and export
  - `battlenet-api.js`: API integration

## Future Enhancements

- [ ] Support for Burning Crusade and Wrath of the Lich King
- [ ] Historical composition tracking
- [ ] Performance analytics over time
- [ ] Integration with more raid management tools
- [ ] Advanced filtering and search
- [ ] Drag-and-drop manual adjustments
- [ ] Saved composition templates

## License

MIT License - See LICENSE file for details

## Credits

Created by NinjaTech AI

Special thanks to:
- Blizzard Entertainment for the Battle.net API
- Raid Helper for raid management tools
- The WoW Classic community for composition guides and data

## Support

For issues, questions, or feature requests, please open an issue on the project repository.

---

**Note**: This tool is not affiliated with or endorsed by Blizzard Entertainment. World of Warcraft and related trademarks are property of Blizzard Entertainment, Inc.