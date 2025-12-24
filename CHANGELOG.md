# Changelog

All notable changes to the WoW Classic Raid Composition Optimizer will be documented in this file.

## [Unreleased]

### Fixed (2024-12-21)
- **Parser Edge Cases**: Fixed parsing errors when Raid Helper JSON contains:
  - Empty slots with null values for name, class, and spec
  - Special status classes like "Tentative", "Late", "Bench", "Absence"
  - Error responses from Raid Helper API (e.g., "Raidplan not found")
  - Mixed valid and invalid player data

### Added (2024-12-21)
- **Enhanced Validation**: Parser now provides detailed warnings for skipped entries
- **Metadata Tracking**: Added metadata object with totalSlots, validPlayers, emptySlots counts
- **Sample Data Files**: Added test files for all edge cases:
  - `raid-helper-error.json` - Error response handling
  - `raid-helper-empty-slots.json` - Empty raid slots
  - `raid-helper-mixed-status.json` - Mixed valid/status entries
- **Test Suite**: Added `test-parser.js` for edge case testing
- **Documentation**: Added `RAID_HELPER_GUIDE.md` with comprehensive format documentation

### Improved (2024-12-21)
- **User Feedback**: Better error messages distinguishing between errors and warnings
- **Console Logging**: Detailed warnings logged to console for debugging
- **Status Display**: Updated UI to show "Valid Players" instead of "Total Players"

## [1.0.0] - 2024-12-21

### Added
- Initial release of WoW Classic Raid Composition Optimizer
- Complete Electron desktop application
- Advanced optimization algorithm with multi-factor scoring
- Battle.net API integration for gear scores
- Support for all raid sizes (5, 10, 20, 25, 40-man)
- Faction filtering (Alliance/Horde)
- Multiple export formats (JSON, CSV, formatted text)
- Comprehensive documentation (10 files, ~60 pages)
- Automated test suite
- Sample data files

### Features
- Raid Helper JSON import with validation
- Multi-factor player scoring algorithm
- Intelligent group formation with synergy optimization
- Role balancing (tanks, healers, DPS)
- Buff and utility analysis
- Customizable class weights and role thresholds
- Settings persistence
- Modern dark-themed UI with 4-tab interface

---

## Version History

### v1.0.0 (2024-12-21)
- Initial production release
- Complete feature set
- 100% documentation coverage
- All tests passing

### v1.0.1 (2024-12-21) - Current
- Bug fixes for Raid Helper edge cases
- Enhanced error handling
- Improved user feedback
- Additional test coverage