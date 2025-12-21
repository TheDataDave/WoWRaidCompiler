const { ipcRenderer } = require('electron');
const { Player } = require('../core/models');
const RaidHelperParser = require('../core/parser');
const RaidOptimizer = require('../core/optimizer');
const BattleNetAPI = require('../core/battlenet-api');

// Application State
const appState = {
    currentData: null,
    players: [],
    optimizedResult: null,
    settings: {
        clientId: '',
        clientSecret: '',
        region: 'us',
        raidSize: 40,
        faction: 'neutral',
        healerPercentage: 25,
        minTanks: 2,
        classWeights: {
            'Warrior': 5,
            'Rogue': 4,
            'Hunter': 5,
            'Mage': 5,
            'Warlock': 5,
            'Priest': 6,
            'Druid': 5,
            'Shaman': 7,
            'Paladin': 6
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeEventListeners();
    loadSettings();
});

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // Remove active class from all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to selected
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Event Listeners
function initializeEventListeners() {
    // Upload tab
    document.getElementById('select-file-btn').addEventListener('click', selectFile);
    
    // Settings tab
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    
    // Composition tab
    document.getElementById('optimize-btn').addEventListener('click', optimizeComposition);
    document.getElementById('fetch-gs-btn').addEventListener('click', fetchGearScores);
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const view = e.target.dataset.view;
            const container = document.getElementById('groups-container');
            container.className = `groups-container ${view}`;
        });
    });
    
    // Export tab
    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
    document.getElementById('copy-clipboard-btn').addEventListener('click', copyToClipboard);
}

// File Selection
async function selectFile() {
    const result = await ipcRenderer.invoke('select-json-file');
    
    if (result.success) {
        appState.currentData = result.data;
        parseRaidData(result.data);
        
        document.getElementById('file-path').textContent = result.path;
        document.getElementById('file-info').classList.remove('hidden');
        document.getElementById('optimize-btn').disabled = false;
        document.getElementById('fetch-gs-btn').disabled = false;
    } else {
        showStatus('error', `Error loading file: ${result.error}`);
    }
}

// Parse Raid Data
function parseRaidData(data) {
    const parser = new RaidHelperParser();
    const result = parser.parse(data);
    
    if (result.success) {
        appState.players = result.players;
        
        const summary = parser.getSummary(result.players);
        displayPlayerSummary(summary);
        
        if (result.warnings.length > 0) {
            console.warn('Parsing warnings:', result.warnings);
        }
        
        showStatus('success', `Successfully loaded ${result.players.length} players`);
    } else {
        showStatus('error', `Parsing errors: ${result.errors.join(', ')}`);
    }
}

// Display Player Summary
function displayPlayerSummary(summary) {
    const container = document.getElementById('player-summary');
    container.innerHTML = '';
    
    // Total players card
    container.innerHTML += `
        <div class="summary-card">
            <h4>Total Players</h4>
            <p style="font-size: 2em; color: #ffd700;">${summary.total}</p>
        </div>
    `;
    
    // Status breakdown
    container.innerHTML += `
        <div class="summary-card">
            <h4>Status</h4>
            <p>✅ Confirmed: ${summary.confirmed}</p>
            <p>❓ Tentative: ${summary.tentative}</p>
            <p>🪑 Benched: ${summary.benched}</p>
        </div>
    `;
    
    // Role breakdown
    container.innerHTML += `
        <div class="summary-card">
            <h4>Roles</h4>
            <p>🛡️ Tanks: ${summary.byRole.tank}</p>
            <p>💚 Healers: ${summary.byRole.healer}</p>
            <p>⚔️ DPS: ${summary.byRole.dps}</p>
        </div>
    `;
    
    // Class breakdown
    let classHTML = '<div class="summary-card"><h4>Classes</h4>';
    Object.entries(summary.byClass).forEach(([className, count]) => {
        classHTML += `<p>${className}: ${count}</p>`;
    });
    classHTML += '</div>';
    container.innerHTML += classHTML;
}

// Settings Management
async function loadSettings() {
    const result = await ipcRenderer.invoke('load-settings');
    
    if (result.success && result.data) {
        appState.settings = { ...appState.settings, ...result.data };
        populateSettingsForm();
    }
}

function populateSettingsForm() {
    document.getElementById('client-id').value = appState.settings.clientId || '';
    document.getElementById('client-secret').value = appState.settings.clientSecret || '';
    document.getElementById('region').value = appState.settings.region || 'us';
    document.getElementById('raid-size').value = appState.settings.raidSize || 40;
    document.getElementById('faction').value = appState.settings.faction || 'neutral';
    document.getElementById('healer-pct').value = appState.settings.healerPercentage || 25;
    document.getElementById('tank-count').value = appState.settings.minTanks || 2;
    
    // Class weights
    Object.entries(appState.settings.classWeights).forEach(([className, weight]) => {
        const input = document.getElementById(`weight-${className.toLowerCase()}`);
        if (input) input.value = weight;
    });
}

async function saveSettings() {
    // Gather settings from form
    appState.settings.clientId = document.getElementById('client-id').value;
    appState.settings.clientSecret = document.getElementById('client-secret').value;
    appState.settings.region = document.getElementById('region').value;
    appState.settings.raidSize = parseInt(document.getElementById('raid-size').value);
    appState.settings.faction = document.getElementById('faction').value;
    appState.settings.healerPercentage = parseInt(document.getElementById('healer-pct').value);
    appState.settings.minTanks = parseInt(document.getElementById('tank-count').value);
    
    // Class weights
    ['warrior', 'rogue', 'hunter', 'mage', 'warlock', 'priest', 'druid', 'shaman', 'paladin'].forEach(className => {
        const input = document.getElementById(`weight-${className}`);
        if (input) {
            const capitalizedClass = className.charAt(0).toUpperCase() + className.slice(1);
            appState.settings.classWeights[capitalizedClass] = parseFloat(input.value);
        }
    });
    
    const result = await ipcRenderer.invoke('save-settings', appState.settings);
    
    if (result.success) {
        showStatus('success', 'Settings saved successfully');
    } else {
        showStatus('error', `Error saving settings: ${result.error}`);
    }
}

// Fetch Gear Scores
async function fetchGearScores() {
    if (!appState.settings.clientId || !appState.settings.clientSecret) {
        showStatus('error', 'Please configure Battle.net API credentials in Settings');
        return;
    }
    
    showStatus('info', 'Fetching gear scores from Battle.net API...');
    
    const api = new BattleNetAPI(
        appState.settings.clientId,
        appState.settings.clientSecret,
        appState.settings.region
    );
    
    // For demo purposes, we'll use a default realm
    // In production, you'd want to prompt for realm or extract from player data
    const defaultRealm = 'Whitemane'; // Example realm
    
    const characters = appState.players.map(player => ({
        name: player.name,
        realm: defaultRealm
    }));
    
    try {
        const results = await api.batchGetGearScores(characters);
        
        let successCount = 0;
        results.forEach(result => {
            if (result.success) {
                const player = appState.players.find(p => p.name === result.name);
                if (player) {
                    player.gearScore = result.gearScore;
                    successCount++;
                }
            }
        });
        
        showStatus('success', `Successfully fetched gear scores for ${successCount}/${appState.players.length} players`);
    } catch (error) {
        showStatus('error', `Error fetching gear scores: ${error.message}`);
    }
}

// Optimize Composition
function optimizeComposition() {
    if (!appState.players || appState.players.length === 0) {
        showStatus('error', 'No players loaded. Please upload a Raid Helper JSON file first.');
        return;
    }
    
    showStatus('info', 'Optimizing raid composition...');
    
    const optimizer = new RaidOptimizer(appState.settings);
    appState.optimizedResult = optimizer.optimize(appState.players);
    
    displayCompositionResults(appState.optimizedResult);
    
    // Enable export buttons
    document.getElementById('export-json-btn').disabled = false;
    document.getElementById('export-csv-btn').disabled = false;
    document.getElementById('copy-clipboard-btn').disabled = false;
    
    showStatus('success', 'Composition optimized successfully!');
}

// Display Composition Results
function displayCompositionResults(result) {
    const container = document.getElementById('groups-container');
    const statsContainer = document.getElementById('stats-container');
    
    container.innerHTML = '';
    statsContainer.innerHTML = '';
    
    // Display groups
    result.groups.forEach(group => {
        const groupCard = createGroupCard(group);
        container.appendChild(groupCard);
    });
    
    // Display statistics
    displayStatistics(result.statistics, statsContainer);
    
    // Update preview
    updateExportPreview();
    
    document.getElementById('composition-results').classList.remove('hidden');
}

function createGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'group-card';
    
    const comp = group.getComposition();
    
    card.innerHTML = `
        <div class="group-header">
            <h4>Group ${group.id}</h4>
            <div class="group-stats">
                <span>🛡️ ${comp.tank}</span>
                <span>💚 ${comp.healer}</span>
                <span>⚔️ ${comp.dps}</span>
                <span>Score: ${group.score}</span>
            </div>
        </div>
        <div class="player-list">
            ${group.players.map(player => createPlayerCard(player)).join('')}
        </div>
    `;
    
    return card;
}

function createPlayerCard(player) {
    const roleIcon = player.roles.primary === 'tank' ? '🛡️' :
                    player.roles.primary === 'healer' ? '💚' : '⚔️';
    
    return `
        <div class="player-card">
            <div class="player-info">
                <div class="class-icon class-${player.class.toLowerCase()}">
                    ${player.class.substring(0, 2).toUpperCase()}
                </div>
                <div class="player-details">
                    <h5>${player.name}</h5>
                    <div class="player-meta">
                        ${player.class} - ${player.spec}
                        <span class="role-badge role-${player.roles.primary}">${roleIcon} ${player.roles.primary}</span>
                    </div>
                </div>
            </div>
            <div class="player-stats">
                <div class="gear-score">${player.gearScore || 'N/A'}</div>
                <div style="font-size: 0.8em; color: #888;">Score: ${player.score}</div>
            </div>
        </div>
    `;
}

function displayStatistics(stats, container) {
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.totalPlayers}</div>
            <div class="stat-label">Total Players</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.composition.tanks}</div>
            <div class="stat-label">Tanks</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.composition.healers}</div>
            <div class="stat-label">Healers</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.composition.dps}</div>
            <div class="stat-label">DPS</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.averageGearScore}</div>
            <div class="stat-label">Avg Gear Score</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.totalGroups}</div>
            <div class="stat-label">Groups</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.averageGroupScore}</div>
            <div class="stat-label">Avg Group Score</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.buffCoverage.length}</div>
            <div class="stat-label">Unique Buffs</div>
        </div>
    `;
}

// Export Functions
async function exportJSON() {
    if (!appState.optimizedResult) return;
    
    const parser = new RaidHelperParser();
    const data = parser.exportToJSON(
        appState.optimizedResult.raid,
        appState.optimizedResult.groups
    );
    
    const result = await ipcRenderer.invoke('save-json-file', data);
    
    if (result.success) {
        showStatus('success', `Exported to ${result.path}`);
    } else {
        showStatus('error', `Export failed: ${result.error}`);
    }
}

async function exportCSV() {
    if (!appState.optimizedResult) return;
    
    const parser = new RaidHelperParser();
    const csv = parser.exportToCSV(
        appState.optimizedResult.raid,
        appState.optimizedResult.groups
    );
    
    const result = await ipcRenderer.invoke('save-csv-file', csv);
    
    if (result.success) {
        showStatus('success', `Exported to ${result.path}`);
    } else {
        showStatus('error', `Export failed: ${result.error}`);
    }
}

function copyToClipboard() {
    if (!appState.optimizedResult) return;
    
    const parser = new RaidHelperParser();
    const text = parser.exportToText(
        appState.optimizedResult.raid,
        appState.optimizedResult.groups
    );
    
    navigator.clipboard.writeText(text).then(() => {
        showStatus('success', 'Copied to clipboard!');
    }).catch(err => {
        showStatus('error', `Failed to copy: ${err.message}`);
    });
}

function updateExportPreview() {
    if (!appState.optimizedResult) return;
    
    const parser = new RaidHelperParser();
    const text = parser.exportToText(
        appState.optimizedResult.raid,
        appState.optimizedResult.groups
    );
    
    document.getElementById('export-preview-text').textContent = text;
}

// Status Messages
function showStatus(type, message) {
    const statusDiv = document.getElementById('optimization-status');
    statusDiv.className = `status-message ${type}`;
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 5000);
}