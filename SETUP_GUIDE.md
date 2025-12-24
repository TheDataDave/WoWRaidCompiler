# WoW Classic Raid Composition Optimizer - Setup Guide

## Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run the Application
```bash
npm start
```

That's it! The application will launch and you can start using it immediately.

## Battle.net API Configuration (Optional but Recommended)

To enable automatic gear score fetching, you need Battle.net API credentials:

### Getting Your API Credentials

1. **Visit Battle.net Developer Portal**
   - Go to: https://develop.battle.net/
   - Sign in with your Battle.net account

2. **Create a New Client**
   - Click "CREATE CLIENT" button
   - Fill in the form:
     - **Client Name**: "WoW Raid Optimizer" (or any name you prefer)
     - **Redirect URLs**: Leave empty or use `http://localhost`
     - **Intended Use**: Select "Desktop Application"
   - Click "CREATE"

3. **Copy Your Credentials**
   - You'll see your **Client ID** and **Client Secret**
   - Keep these secure - treat them like passwords!

4. **Enter in Application**
   - Open the WoW Raid Optimizer
   - Go to the **Settings** tab
   - Paste your Client ID and Client Secret
   - Select your region (US, EU, KR, TW)
   - Click "Save Settings"

### Testing API Connection

1. Load a Raid Helper JSON file (use the sample in `sample-data/`)
2. Go to the **Composition** tab
3. Click "Fetch Gear Scores"
4. If successful, you'll see gear scores populated for characters

**Note**: The API can only fetch data for characters that exist on Battle.net servers. For testing without real characters, you can skip this step and the optimizer will work with default gear scores.

## Using Sample Data

A sample Raid Helper JSON file is included for testing:

1. Launch the application
2. Go to the **Upload** tab
3. Click "Select File"
4. Navigate to `sample-data/raid-helper-sample.json`
5. The file will be parsed and you'll see a summary of 25 players

## Exporting from Raid Helper

If you use Raid Helper Discord bot:

1. Create a raid event in Discord using Raid Helper
2. Wait for signups
3. Use the Raid Helper export command to get JSON data
4. Save the JSON to a file
5. Import it into the optimizer

## Configuration Tips

### Raid Size Selection
- **5-Man**: Dungeons (1 tank, 1 healer, 3 DPS)
- **10-Man**: Small raids (1-2 tanks, 2-3 healers)
- **20-Man**: ZG, AQ20 (2-3 tanks, 4-6 healers)
- **25-Man**: Karazhan (2-3 tanks, 5-7 healers)
- **40-Man**: MC, BWL, AQ40, Naxx (3-5 tanks, 8-12 healers)

### Faction Settings
- **Neutral**: All classes available (for testing)
- **Alliance**: No Shamans (Paladins only)
- **Horde**: No Paladins (Shamans only)

### Healer Percentage
- **Small Raids (5-10)**: 20-30%
- **Medium Raids (20-25)**: 20-25%
- **Large Raids (40)**: 20-30%

Adjust based on encounter difficulty and healing requirements.

### Class Weights
Higher weights = higher priority in selection:
- **7-10**: Critical classes (Shamans for Horde, Paladins for Alliance)
- **5-6**: Standard DPS and healers
- **3-4**: Situational or less optimal specs
- **0-2**: Rarely needed or bench priority

## Workflow Example

### Scenario: 40-Man Molten Core Raid

1. **Import Signups**
   - Upload Raid Helper JSON with 50+ signups
   - Review the summary (classes, roles, confirmations)

2. **Configure Settings**
   - Raid Size: 40
   - Faction: Horde
   - Healer %: 25% (10 healers)
   - Min Tanks: 3
   - Shaman Weight: 8 (high priority for totems)

3. **Fetch Gear Scores** (Optional)
   - Click "Fetch Gear Scores"
   - Wait for API to retrieve data
   - Review gear scores in composition view

4. **Optimize**
   - Click "Optimize Composition"
   - Review the 8 groups created
   - Check role distribution and buff coverage

5. **Manual Adjustments** (If Needed)
   - Note any issues in the composition
   - Adjust class weights if needed
   - Re-optimize

6. **Export**
   - Export to JSON for record-keeping
   - Export to CSV for spreadsheet analysis
   - Copy to clipboard for Discord announcement

## Troubleshooting

### Application Won't Start
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm start
```

### Battle.net API Errors

**"Authentication Failed"**
- Double-check Client ID and Secret
- Ensure no extra spaces when copying
- Verify credentials are for the correct region

**"Character Not Found"**
- Character name must be exact (case-sensitive)
- Character must exist on the specified realm
- Try a different realm or character

**"Rate Limit Exceeded"**
- Wait 1-2 minutes before retrying
- The app includes automatic rate limiting
- Consider fetching gear scores in smaller batches

### Import Errors

**"Missing Required Fields"**
- Ensure JSON has `name`, `class`, and `spec` for each player
- Check JSON is valid (use a JSON validator)

**"Invalid Class Name"**
- Class names must match exactly: Warrior, Priest, Mage, Warlock, Rogue, Hunter, Druid, Shaman, Paladin
- Check for typos or extra spaces

### Performance Issues

**Slow Optimization**
- Normal for 40-man raids (2-3 seconds)
- Close other applications to free memory
- Reduce class weight complexity

**Slow Gear Score Fetching**
- Expected for large rosters (100ms per character)
- 40 characters = ~4 seconds minimum
- Cannot be sped up due to API rate limits

## Advanced Usage

### Custom JSON Format

If you're not using Raid Helper, you can create your own JSON:

```json
{
  "raidDrop": [
    {
      "name": "PlayerName",
      "class": "Warrior",
      "spec": "Protection",
      "isConfirmed": true
    }
  ]
}
```

Minimum required fields: `name`, `class`, `spec`

### Scripting and Automation

The core modules can be used programmatically:

```javascript
const { Player } = require('./src/core/models');
const RaidOptimizer = require('./src/core/optimizer');

// Create players
const players = [/* ... */];

// Configure optimizer
const optimizer = new RaidOptimizer({
  raidSize: 40,
  faction: 'horde',
  healerPercentage: 25
});

// Optimize
const result = optimizer.optimize(players);
console.log(result);
```

## Building for Distribution

### Windows
```bash
npm run build
# Creates installer in dist/WoW Raid Optimizer Setup.exe
```

### macOS
```bash
npm run build
# Creates DMG in dist/WoW Raid Optimizer.dmg
```

### Linux
```bash
npm run build
# Creates AppImage in dist/WoW Raid Optimizer.AppImage
```

## Getting Help

### Common Questions

**Q: Can I use this for retail WoW?**
A: Currently optimized for Classic. Retail support planned for future versions.

**Q: Does this work with other raid management tools?**
A: Currently supports Raid Helper JSON format. Other formats can be adapted.

**Q: Can I manually adjust the composition?**
A: Currently automatic only. Manual editing planned for future versions.

**Q: Is my data stored anywhere?**
A: All data is stored locally on your computer. Nothing is sent to external servers except Battle.net API calls.

**Q: Can I save multiple compositions?**
A: Currently one composition at a time. History tracking planned for future versions.

### Need More Help?

- Check the main README.md for detailed documentation
- Review the sample data for format examples
- Open an issue on the project repository

## Next Steps

1. ✅ Install and run the application
2. ✅ Configure Battle.net API (optional)
3. ✅ Load sample data to test
4. ✅ Experiment with different settings
5. ✅ Import your real raid data
6. ✅ Optimize and export your composition

Happy raiding! 🎮⚔️