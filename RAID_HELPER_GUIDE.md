# Raid Helper JSON Format Guide

This guide explains how the application handles different Raid Helper JSON formats and edge cases.

## Supported Scenarios

### 1. Error Response
When Raid Helper returns an error (e.g., raid plan not found):
```json
{
  "reason": "Raidplan not found."
}
```
**Handling**: Application displays error message to user.

### 2. Empty Slots
When raid groups are created but no players assigned:
```json
{
  "raidDrop": [
    {
      "partyId": 1,
      "slotId": 1,
      "class": null,
      "spec": null,
      "name": null,
      ...
    }
  ]
}
```
**Handling**: Empty slots are skipped. If all slots are empty, shows error message.

### 3. Special Status Classes
Raid Helper uses special "class" values to indicate player status:
- `"Tentative"` - Player is tentative
- `"Late"` - Player will be late
- `"Bench"` - Player is benched
- `"Absence"` - Player is absent

**Example**:
```json
{
  "class": "Tentative",
  "spec": "Restoration1",
  "name": "PlayerName"
}
```

**Handling**: These entries are skipped with a warning since we cannot determine the actual WoW class. The application logs:
```
Slot X (PlayerName): Status class 'Tentative' - skipping (cannot determine actual WoW class)
```

### 4. Mixed Valid and Invalid Data
Real raid data often contains a mix of:
- Valid players with proper class/spec
- Empty slots (null values)
- Status indicators (Tentative, Late, Bench)

**Handling**: 
- Valid players are imported
- Empty slots are silently skipped
- Status indicators are skipped with warnings
- Summary shows: "Loaded X valid players. Y warnings"

## Valid WoW Classes

The application recognizes these WoW Classic classes:
- Warrior
- Rogue
- Hunter
- Mage
- Warlock
- Priest
- Druid
- Shaman
- Paladin

## Recommendations

### For Best Results:
1. **Ensure players have actual WoW classes assigned** in Raid Helper
2. **Use Raid Helper's built-in status features** rather than changing class to "Tentative" or "Bench"
3. **Export after players have signed up** - empty raids will show an error

### Handling Status Players:
If you need to track tentative/late/bench players:
1. Keep them in Raid Helper with their actual class
2. Use Raid Helper's confirmation status or notes
3. The optimizer will respect `isConfirmed` field

### Future Enhancement:
We're considering adding support for inferring actual class from spec when status classes are used. For example:
- `class: "Tentative"` + `spec: "Restoration1"` → Could infer Shaman or Druid
- This would require additional logic and may not always be accurate

## Testing

Test files are provided in `sample-data/`:
- `raid-helper-error.json` - Error response
- `raid-helper-empty-slots.json` - Empty raid
- `raid-helper-mixed-status.json` - Mixed valid/status entries
- `raid-helper-sample.json` - Complete valid raid

Run tests with:
```bash
node test-parser.js
```

## Troubleshooting

### "No valid players found"
- Check that players have actual WoW classes assigned
- Verify the JSON has a `raidDrop` array
- Ensure at least one player has name, class, and spec

### "Status class 'X' - skipping"
- This is a warning, not an error
- The player has a status indicator instead of a WoW class
- Update the player's class in Raid Helper to their actual WoW class

### Players missing from import
- Check console for warnings
- Verify player has all required fields: name, class, spec
- Ensure class is a valid WoW class name

## API Reference

### Parser Validation
```javascript
const parser = new RaidHelperParser();
const result = parser.parse(data);

if (result.success) {
  console.log(`Loaded ${result.players.length} players`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log('Metadata:', result.metadata);
} else {
  console.error('Errors:', result.errors);
}
```

### Metadata Fields
```javascript
{
  totalSlots: 40,        // Total slots in raid
  validPlayers: 35,      // Successfully parsed players
  emptySlots: 5,         // Skipped empty slots
  partyPerRaid: 8,       // Number of groups
  slotPerParty: 5,       // Players per group
  raidId: "..."          // Raid Helper ID
}
```

## Support

For issues or questions:
1. Check this guide first
2. Review console warnings
3. Test with sample data files
4. Open an issue with your JSON (remove sensitive data)