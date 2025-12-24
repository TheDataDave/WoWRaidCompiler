# WoW Classic Raid Composition Optimizer - File Manifest

## Project Files Overview

### 📋 Documentation Files (5)
- **README.md** - Main project documentation with features and overview
- **SETUP_GUIDE.md** - Installation and Battle.net API configuration guide
- **USER_GUIDE.md** - Complete user manual with step-by-step workflows
- **PROJECT_SUMMARY.md** - Technical summary and architecture details
- **LAUNCH_INSTRUCTIONS.md** - Quick start guide for first-time users

### 🔧 Configuration Files (3)
- **package.json** - NPM dependencies and build scripts
- **package-lock.json** - Locked dependency versions
- **.gitignore** - Git ignore rules

### 💻 Source Code Files (8)

#### Main Process
- **src/main.js** - Electron main process, IPC handlers, window management

#### Core Modules
- **src/core/models.js** - Data models (Player, Raid, Group classes)
- **src/core/optimizer.js** - Optimization algorithm and scoring system
- **src/core/parser.js** - JSON parsing, validation, and export functions
- **src/core/battlenet-api.js** - Battle.net API integration with OAuth

#### Renderer Process
- **src/renderer/index.html** - Main UI structure with 4-tab interface
- **src/renderer/styles.css** - Complete styling with dark theme
- **src/renderer/app.js** - Frontend logic, event handlers, UI updates

### 🧪 Testing & Sample Data (3)
- **test-app.js** - Automated test suite for core functionality
- **sample-data/raid-helper-sample.json** - Sample raid data with 25 players
- **todo.md** - Development checklist (all tasks completed)

## File Statistics

```
Total Files: 19
- Documentation: 5 files
- Source Code: 8 files
- Configuration: 3 files
- Testing/Data: 3 files

Lines of Code (estimated):
- JavaScript: ~2,500 lines
- HTML: ~300 lines
- CSS: ~800 lines
- Documentation: ~2,000 lines
Total: ~5,600 lines
```

## Directory Structure

```
wow-classic-raid-optimizer/
├── Documentation (Root Level)
│   ├── README.md                    # Main documentation
│   ├── SETUP_GUIDE.md              # Setup instructions
│   ├── USER_GUIDE.md               # User manual
│   ├── PROJECT_SUMMARY.md          # Technical summary
│   ├── LAUNCH_INSTRUCTIONS.md      # Quick start
│   └── FILE_MANIFEST.md            # This file
│
├── Configuration
│   ├── package.json                # Dependencies
│   ├── package-lock.json           # Locked versions
│   ├── .gitignore                  # Git ignore
│   └── todo.md                     # Development checklist
│
├── Source Code
│   ├── src/
│   │   ├── main.js                 # Electron main process
│   │   ├── core/
│   │   │   ├── models.js           # Data models
│   │   │   ├── optimizer.js        # Algorithm
│   │   │   ├── parser.js           # Parsing/export
│   │   │   └── battlenet-api.js    # API integration
│   │   └── renderer/
│   │       ├── index.html          # UI structure
│   │       ├── styles.css          # Styling
│   │       └── app.js              # Frontend logic
│
├── Testing & Data
│   ├── test-app.js                 # Test suite
│   └── sample-data/
│       └── raid-helper-sample.json # Sample data
│
└── Dependencies
    └── node_modules/               # NPM packages (317 packages)
```

## Key File Descriptions

### Documentation Files

**README.md** (Main Documentation)
- Project overview and features
- Installation instructions
- Usage examples
- Technical details
- Algorithm explanation
- Troubleshooting guide

**SETUP_GUIDE.md** (Setup Instructions)
- Quick start (5 minutes)
- Battle.net API configuration
- Sample data usage
- Configuration tips
- Workflow examples
- Advanced usage

**USER_GUIDE.md** (User Manual)
- Interface overview
- Step-by-step workflows
- Algorithm explanation
- Tips and best practices
- FAQ section
- Troubleshooting

**PROJECT_SUMMARY.md** (Technical Summary)
- Architecture overview
- Implementation details
- Testing results
- Performance metrics
- Future enhancements
- Deployment instructions

**LAUNCH_INSTRUCTIONS.md** (Quick Start)
- First-time setup
- Launch commands
- Sample data testing
- Troubleshooting
- Next steps

### Source Code Files

**src/main.js** (Electron Main Process)
- Window creation and management
- IPC communication handlers
- File dialog operations
- Settings persistence
- ~150 lines

**src/core/models.js** (Data Models)
- Player class with role detection
- Raid class with composition tracking
- Group class with synergy scoring
- Buff and utility calculations
- ~250 lines

**src/core/optimizer.js** (Optimization Algorithm)
- Player scoring system
- Role threshold calculation
- Group formation logic
- Synergy optimization
- Statistics generation
- ~300 lines

**src/core/parser.js** (Data Processing)
- Raid Helper JSON parsing
- Data validation
- Export to JSON/CSV/text
- Summary generation
- ~200 lines

**src/core/battlenet-api.js** (API Integration)
- OAuth authentication
- Character equipment fetching
- Gear score calculation
- Batch processing
- Rate limiting
- ~150 lines

**src/renderer/index.html** (UI Structure)
- 4-tab interface layout
- Upload section
- Settings panel
- Composition display
- Export options
- ~300 lines

**src/renderer/styles.css** (Styling)
- Dark theme design
- Responsive layout
- Class-colored badges
- Animations and transitions
- Custom scrollbars
- ~800 lines

**src/renderer/app.js** (Frontend Logic)
- Tab management
- Event handlers
- Data visualization
- Export functions
- Status messages
- ~650 lines

### Testing & Data Files

**test-app.js** (Test Suite)
- Data parsing tests
- Optimization tests
- Export format tests
- Model validation
- ~100 lines

**sample-data/raid-helper-sample.json** (Sample Data)
- 25 player signups
- Multiple classes and specs
- Realistic raid composition
- Valid Raid Helper format
- ~200 lines

## File Dependencies

### Main Process Dependencies
```
src/main.js
├── electron (window management)
├── fs (file operations)
└── path (path handling)
```

### Core Module Dependencies
```
src/core/models.js
└── (no external dependencies)

src/core/optimizer.js
└── ./models.js

src/core/parser.js
└── ./models.js

src/core/battlenet-api.js
└── https (API calls)
```

### Renderer Dependencies
```
src/renderer/app.js
├── electron (IPC)
├── ../core/models.js
├── ../core/parser.js
├── ../core/optimizer.js
└── ../core/battlenet-api.js
```

## Build Artifacts (Generated)

When you run `npm run build`, these files are created:

```
dist/
├── win-unpacked/              # Windows build
├── mac/                       # macOS build
├── linux-unpacked/            # Linux build
├── WoW Raid Optimizer Setup.exe    # Windows installer
├── WoW Raid Optimizer.dmg          # macOS installer
└── WoW Raid Optimizer.AppImage     # Linux installer
```

## Usage by File Type

### For End Users
**Essential Files**:
- README.md (overview)
- LAUNCH_INSTRUCTIONS.md (quick start)
- sample-data/raid-helper-sample.json (testing)

**Reference Files**:
- SETUP_GUIDE.md (configuration)
- USER_GUIDE.md (detailed usage)

### For Developers
**Essential Files**:
- PROJECT_SUMMARY.md (architecture)
- src/* (all source code)
- test-app.js (testing)

**Reference Files**:
- package.json (dependencies)
- FILE_MANIFEST.md (this file)

### For Contributors
**Essential Files**:
- README.md (project overview)
- PROJECT_SUMMARY.md (technical details)
- src/* (source code)
- .gitignore (git rules)

## File Sizes (Approximate)

```
Documentation:     ~150 KB
Source Code:       ~100 KB
Sample Data:       ~10 KB
Configuration:     ~5 KB
Total (excluding node_modules): ~265 KB

With node_modules: ~150 MB
```

## Maintenance Notes

### Files to Update for New Features
1. **src/core/optimizer.js** - Algorithm changes
2. **src/renderer/app.js** - UI functionality
3. **src/renderer/index.html** - UI structure
4. **README.md** - Feature documentation
5. **USER_GUIDE.md** - Usage instructions

### Files to Update for Bug Fixes
1. Identify affected module in src/core/ or src/renderer/
2. Update test-app.js if needed
3. Update documentation if behavior changes

### Files to Update for Version Releases
1. **package.json** - Version number
2. **README.md** - Version and changelog
3. **PROJECT_SUMMARY.md** - Version status

---

**Last Updated**: Project Completion
**Total Project Size**: ~150 MB (with dependencies)
**Core Application Size**: ~265 KB (without dependencies)