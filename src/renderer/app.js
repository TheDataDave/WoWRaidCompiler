const { ipcRenderer } = require("electron");
const { Player } = require("../core/models");
const { RaidHelperParser } = require("../core/parser");
const { RaidHelperAPI } = require("../core/api");
const RaidOptimizer = require("../core/optimizer");
const BattleNetAPI = require("../core/battlenet-api");

// Application State
const appState = {
	currentData: null,
	players: [],
	optimizedResult: null,
	events: [],
	selectedEvent: null,
	api: null,
	settings: {
		clientId: "",
		clientSecret: "",
		region: "us",
		raidSize: 40,
		faction: "neutral",
		healerPercentage: 25,
		minTanks: 2,
		serverId: "",
		raidHelperAPIKey: "",
		classWeights: {
			Warrior: 5,
			Rogue: 4,
			Hunter: 5,
			Mage: 5,
			Warlock: 5,
			Priest: 6,
			Druid: 5,
			Shaman: 7,
			Paladin: 6,
		},
	},
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
	initializeTabs();
	initializeEventListeners();
	loadSettings();
});

// Tab Management
function initializeTabs() {
	const tabButtons = document.querySelectorAll(".tab-btn");
	const tabContents = document.querySelectorAll(".tab-content");

	tabButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const tabName = button.dataset.tab;

			// Remove active class from all
			tabButtons.forEach((btn) => btn.classList.remove("active"));
			tabContents.forEach((content) =>
				content.classList.remove("active")
			);

			// Add active class to selected
			button.classList.add("active");
			document.getElementById(`${tabName}-tab`).classList.add("active");

			// Load events when upload tab is selected
			if (tabName === "upload" && appState.api) {
				loadEventList();
			}
		});
	});
}

// Event Listeners
function initializeEventListeners() {
	// Event list actions
	document
		.getElementById("refresh-events-btn")
		.addEventListener("click", loadEventList);

	document
		.getElementById("load-event-btn")
		.addEventListener("click", loadSelectedEvent);

	document
		.getElementById("cancel-event-btn")
		.addEventListener("click", cancelEventSelection);

	// Settings tab
	document
		.getElementById("save-settings-btn")
		.addEventListener("click", saveSettings);

	// Composition tab
	document
		.getElementById("optimize-btn")
		.addEventListener("click", optimizeComposition);
	document
		.getElementById("fetch-gs-btn")
		.addEventListener("click", fetchGearScores);

	// View toggle
	document.querySelectorAll(".view-btn").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			document
				.querySelectorAll(".view-btn")
				.forEach((b) => b.classList.remove("active"));
			e.target.classList.add("active");

			const view = e.target.dataset.view;
			const container = document.getElementById("groups-container");
			container.className = `groups-container ${view}`;
		});
	});

	// Export tab
	document
		.getElementById("export-json-btn")
		.addEventListener("click", exportJSON);
	document
		.getElementById("export-csv-btn")
		.addEventListener("click", exportCSV);
	document
		.getElementById("copy-clipboard-btn")
		.addEventListener("click", copyToClipboard);
}

// Event List Functions
async function loadEventList() {
	if (!appState.api) {
		if (
			!appState.settings.serverId ||
			!appState.settings.raidHelperAPIKey
		) {
			showEventError(
				"Please configure Raid Helper API credentials in Settings first"
			);
			return;
		}
		appState.api = new RaidHelperAPI(
			appState.settings.serverId,
			appState.settings.raidHelperAPIKey
		);
	}

	showLoading(true);
	hideEventError();

	try {
		const events = await appState.api.fetchAllEvents();
		appState.events = events.postedEvents || [];

		if (appState.events.length === 0) {
			showEventError("No events found for this server");
		} else {
			displayEventList(appState.events);
		}
	} catch (error) {
		console.error("Error loading events:", error);
		showEventError(`Failed to load events: ${error.message}`);
	} finally {
		showLoading(false);
	}
}

function displayEventList(events) {
	const container = document.getElementById("event-list");
	container.innerHTML = "";

	if (events.length === 0) {
		container.innerHTML =
			'<p style="text-align: center; color: #888;">No events available</p>';
		return;
	}

	events.forEach((event) => {
		const card = createEventCard(event);
		container.appendChild(card);
	});
}

function createEventCard(event) {
	const card = document.createElement("div");
	card.className = "event-card";
	card.dataset.eventId = event.id;

	const status = appState.api.getEventStatus(event);
	const date = appState.api.formatEventDate(event.startTime);
	const signupCount = event.signUps?.length || 0;

	card.innerHTML = `
		<div class="event-card-header">
			<h4 class="event-title">${event.title || "Untitled Event"}</h4>
			<span class="event-status ${status}">${status}</span>
		</div>
		<div class="event-meta">
			<div class="event-meta-item">
				<span>📅</span>
				<span>${date}</span>
			</div>
			<div class="event-meta-item">
				<span>👥</span>
				<span>${signupCount} signups</span>
			</div>
		</div>
		${
			event.description
				? `<div class="event-description">${event.description}</div>`
				: ""
		}
	`;

	card.addEventListener("click", () => selectEvent(event));

	return card;
}

function selectEvent(event) {
	appState.selectedEvent = event;

	// Update UI
	document.querySelectorAll(".event-card").forEach((card) => {
		card.classList.remove("selected");
	});
	document
		.querySelector(`[data-event-id="${event.id}"]`)
		.classList.add("selected");

	// Show event details
	displayEventDetails(event);
}

function displayEventDetails(event) {
	const container = document.getElementById("event-details-content");
	const status = appState.api.getEventStatus(event);
	const date = appState.api.formatEventDate(event.startTime);
	const endDate = appState.api.formatEventDate(event.endTime);

	container.innerHTML = `
		<div class="detail-row">
			<span class="detail-label">Event ID:</span>
			<span class="detail-value">${event.id}</span>
		</div>
		<div class="detail-row">
			<span class="detail-label">Title:</span>
			<span class="detail-value">${event.title || "Untitled"}</span>
		</div>
		<div class="detail-row">
			<span class="detail-label">Status:</span>
			<span class="detail-value">${status.toUpperCase()}</span>
		</div>
		<div class="detail-row">
			<span class="detail-label">Start Time:</span>
			<span class="detail-value">${date}</span>
		</div>
		<div class="detail-row">
			<span class="detail-label">End Time:</span>
			<span class="detail-value">${endDate}</span>
		</div>
		<div class="detail-row">
			<span class="detail-label">Signups:</span>
			<span class="detail-value">${event.signUps?.length || 0}</span>
		</div>
		${
			event.description
				? `
		<div class="detail-row">
			<span class="detail-label">Description:</span>
			<span class="detail-value">${event.description}</span>
		</div>
		`
				: ""
		}
	`;

	document.getElementById("event-details").classList.remove("hidden");
}

function cancelEventSelection() {
	appState.selectedEvent = null;
	document.querySelectorAll(".event-card").forEach((card) => {
		card.classList.remove("selected");
	});
	document.getElementById("event-details").classList.add("hidden");
}

async function loadSelectedEvent() {
	if (!appState.selectedEvent) {
		showStatus("error", "No event selected");
		return;
	}

	showLoading(true);

	try {
		// Fetch full event data using the event ID
		const eventData = await appState.api.fetchEventData(
			appState.selectedEvent.id
		);

		appState.currentData = eventData;
		parseRaidData(eventData);

		// Update UI
		document.getElementById(
			"event-info"
		).textContent = `Loaded: ${appState.selectedEvent.title} (Event ID: ${appState.selectedEvent.id})`;
		document.getElementById("file-info").classList.remove("hidden");
		document.getElementById("event-details").classList.add("hidden");

		// Enable optimization buttons
		document.getElementById("optimize-btn").disabled = false;
		document.getElementById("fetch-gs-btn").disabled = false;

		showStatus(
			"success",
			`Successfully loaded event: ${appState.selectedEvent.title}`
		);
	} catch (error) {
		console.error("Error loading event data:", error);
		showStatus("error", `Failed to load event: ${error.message}`);
	} finally {
		showLoading(false);
	}
}

function showLoading(show) {
	const loader = document.getElementById("event-loading");
	if (show) {
		loader.classList.remove("hidden");
	} else {
		loader.classList.add("hidden");
	}
}

function showEventError(message) {
	const errorDiv = document.getElementById("event-error");
	errorDiv.textContent = message;
	errorDiv.classList.remove("hidden");
}

function hideEventError() {
	document.getElementById("event-error").classList.add("hidden");
}

// Parse Raid Data
function parseRaidData(data) {
	console.log("data:", data);
	const parser = new RaidHelperParser();
	const result = parser.parse(data);

	if (result.success) {
		appState.players = result.players;

		const summary = parser.getSummary(result.players);
		displayPlayerSummary(summary);

		// Show warnings if any
		if (result.warnings && result.warnings.length > 0) {
			console.warn("Parsing warnings:", result.warnings);
			showStatus(
				"info",
				`Loaded ${result.players.length} valid players. ${result.warnings.length} warnings - check console for details.`
			);
		}

		// Show metadata info
		if (result.metadata) {
			console.log("Raid metadata:", result.metadata);
		}
	} else {
		const errorMsg = result.errors.join("\n");
		showStatus("error", `Failed to load raid data: ${result.errors[0]}`);
		console.error("Parsing errors:", result.errors);
	}
}

// Display Player Summary
function displayPlayerSummary(players) {
	const container = document.getElementById("player-summary");
	container.innerHTML = "";
	console.log("players:", players);

	// Total players card
	container.innerHTML += `
        <div class="summary-card">
            <h4>Valid Players</h4>
            <p style="font-size: 2em; color: #ffd700;">${players.confirmed}(+${players.tentative})</p>
        </div>
    `;

	// Status breakdown
	container.innerHTML += `
        <div class="summary-card">
            <h4>Status</h4>
            <p>✅ Confirmed: ${players.confirmed}</p>
            <p>❓ Tentative: ${players.tentative}</p>
            <p>🪑 Benched: ${players.benched}</p>
            <p>❌ Absent: ${players.absence}</p>
            <p>⏳ Late: ${players.late}</p>
        </div>
    `;

	// Role breakdown
	container.innerHTML += `
        <div class="summary-card">
            <h4>Roles</h4>
            <p>🛡️ Tanks: ${players.byRole.tank}</p>
            <p>💚 Healers: ${players.byRole.healer}</p>
            <p>⚔️ DPS: ${players.byRole.dps}</p>
        </div>
    `;

	// Class breakdown
	let classHTML = '<div class="summary-card"><h4>Classes</h4>';
	Object.entries(players.byClass).forEach(([className, count]) => {
		classHTML += `<p>${className}: ${count}</p>`;
	});
	classHTML += "</div>";
	container.innerHTML += classHTML;
}

// Settings Management
async function loadSettings() {
	const result = await ipcRenderer.invoke("load-settings");

	if (result.success && result.data) {
		appState.settings = { ...appState.settings, ...result.data };
		populateSettingsForm();

		// Initialize API if credentials are available
		if (appState.settings.serverId && appState.settings.raidHelperAPIKey) {
			appState.api = new RaidHelperAPI(
				appState.settings.serverId,
				appState.settings.raidHelperAPIKey
			);
		}
	}
}

function populateSettingsForm() {
	document.getElementById("client-id").value =
		appState.settings.clientId || "";
	document.getElementById("api-key").value =
		appState.settings.raidHelperAPIKey || "";
	document.getElementById("server-id").value =
		appState.settings.serverId || "";
	document.getElementById("client-secret").value =
		appState.settings.clientSecret || "";
	document.getElementById("region").value = appState.settings.region || "us";
	document.getElementById("raid-size").value =
		appState.settings.raidSize || 40;
	document.getElementById("faction").value =
		appState.settings.faction || "neutral";
	document.getElementById("healer-pct").value =
		appState.settings.healerPercentage || 25;
	document.getElementById("tank-count").value =
		appState.settings.minTanks || 2;

	// Class weights
	Object.entries(appState.settings.classWeights).forEach(
		([className, weight]) => {
			const input = document.getElementById(
				`weight-${className.toLowerCase()}`
			);
			if (input) input.value = weight;
		}
	);
}

async function saveSettings() {
	// Gather settings from form
	appState.settings.clientId = document.getElementById("client-id").value;
	appState.settings.raidHelperAPIKey =
		document.getElementById("api-key").value;
	appState.settings.serverId = document.getElementById("server-id").value;
	appState.settings.clientSecret =
		document.getElementById("client-secret").value;
	appState.settings.region = document.getElementById("region").value;
	appState.settings.raidSize = parseInt(
		document.getElementById("raid-size").value
	);
	appState.settings.faction = document.getElementById("faction").value;
	appState.settings.healerPercentage = parseInt(
		document.getElementById("healer-pct").value
	);
	appState.settings.minTanks = parseInt(
		document.getElementById("tank-count").value
	);

	// Class weights
	[
		"warrior",
		"rogue",
		"hunter",
		"mage",
		"warlock",
		"priest",
		"druid",
		"shaman",
		"paladin",
	].forEach((className) => {
		const input = document.getElementById(`weight-${className}`);
		if (input) {
			const capitalizedClass =
				className.charAt(0).toUpperCase() + className.slice(1);
			appState.settings.classWeights[capitalizedClass] = parseFloat(
				input.value
			);
		}
	});

	const result = await ipcRenderer.invoke("save-settings", appState.settings);

	if (result.success) {
		showStatus("success", "Settings saved successfully");

		// Reinitialize API with new credentials
		if (appState.settings.serverId && appState.settings.raidHelperAPIKey) {
			appState.api = new RaidHelperAPI(
				appState.settings.serverId,
				appState.settings.raidHelperAPIKey
			);
		}
	} else {
		showStatus("error", `Error saving settings: ${result.error}`);
	}
}

// Fetch Gear Scores
async function fetchGearScores() {
	if (!appState.settings.clientId || !appState.settings.clientSecret) {
		showStatus(
			"error",
			"Please configure Battle.net API credentials in Settings"
		);
		return;
	}

	showStatus("info", "Fetching gear scores from Battle.net API...");

	const api = new BattleNetAPI(
		appState.settings.clientId,
		appState.settings.clientSecret,
		appState.settings.region
	);

	const defaultRealm = "Whitemane";

	const characters = appState.players.map((player) => ({
		name: player.name,
		realm: defaultRealm,
	}));

	try {
		const results = await api.batchGetGearScores(characters);

		let successCount = 0;
		results.forEach((result) => {
			if (result.success) {
				const player = appState.players.find(
					(p) => p.name === result.name
				);
				if (player) {
					player.gearScore = result.gearScore;
					successCount++;
				}
			}
		});

		showStatus(
			"success",
			`Successfully fetched gear scores for ${successCount}/${appState.players.length} players`
		);
	} catch (error) {
		showStatus("error", `Error fetching gear scores: ${error.message}`);
	}
}

// Optimize Composition
function optimizeComposition() {
	if (!appState.players || appState.players.length === 0) {
		showStatus(
			"error",
			"No players loaded. Please select and load an event first."
		);
		return;
	}

	const modeRadios = document.getElementsByName("opt-mode");
	let selectedMode = "global";
	for (const radio of modeRadios) {
		if (radio.checked) {
			selectedMode = radio.value;
			break;
		}
	}

	console.log(`🎯 User selected optimization mode: ${selectedMode}`);

	showStatus(
		"info",
		`Optimizing raid composition using ${
			selectedMode === "global"
				? "Global Optimization"
				: "Legacy Algorithm"
		}...`
	);

	appState.settings.optimizationMode = selectedMode;

	const optimizer = new RaidOptimizer(appState.settings);
	appState.optimizedResult = optimizer.optimize(
		appState.players,
		selectedMode
	);

	displayCompositionResults(appState.optimizedResult);

	document.getElementById("export-json-btn").disabled = false;
	document.getElementById("export-csv-btn").disabled = false;
	document.getElementById("copy-clipboard-btn").disabled = false;

	const modeText =
		selectedMode === "global" ? "Global Optimization" : "Legacy Algorithm";
	showStatus(
		"success",
		`Composition optimized successfully using ${modeText}!`
	);
}

// Display Composition Results
function displayCompositionResults(result) {
	const container = document.getElementById("groups-container");
	const statsContainer = document.getElementById("stats-container");

	container.innerHTML = "";
	statsContainer.innerHTML = "";

	result.groups.forEach((group) => {
		const groupCard = createGroupCard(group);
		container.appendChild(groupCard);
	});

	displayStatistics(result.statistics, statsContainer);
	updateExportPreview();

	document.getElementById("composition-results").classList.remove("hidden");
}

function createGroupCard(group) {
	const card = document.createElement("div");
	card.className = "group-card";

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
            ${group.players.map((player) => createPlayerCard(player)).join("")}
        </div>
    `;

	return card;
}

function createPlayerCard(player) {
	const roleIcon =
		player.roles.primary === "tank"
			? "🛡️"
			: player.roles.primary === "healer"
			? "💚"
			: "⚔️";

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
                        <span class="role-badge role-${
							player.roles.primary
						}">${roleIcon} ${player.roles.primary}</span>
                    </div>
                </div>
            </div>
            <div class="player-stats">
                <div class="gear-score">${player.gearScore || "N/A"}</div>
                <div style="font-size: 0.8em; color: #888;">Score: ${
					player.score
				}</div>
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

	const result = await ipcRenderer.invoke("save-json-file", data);

	if (result.success) {
		showStatus("success", `Exported to ${result.path}`);
	} else {
		showStatus("error", `Export failed: ${result.error}`);
	}
}

async function exportCSV() {
	if (!appState.optimizedResult) return;

	const parser = new RaidHelperParser();
	const csv = parser.exportToCSV(
		appState.optimizedResult.raid,
		appState.optimizedResult.groups
	);

	const result = await ipcRenderer.invoke("save-csv-file", csv);

	if (result.success) {
		showStatus("success", `Exported to ${result.path}`);
	} else {
		showStatus("error", `Export failed: ${result.error}`);
	}
}

function copyToClipboard() {
	if (!appState.optimizedResult) return;

	const parser = new RaidHelperParser();
	// const text = parser.exportToText(
	// 	appState.optimizedResult.raid,
	// 	appState.optimizedResult.groups
	// );

	// navigator.clipboard
	// 	.writeText(text)
	// 	.then(() => {
	// 		showStatus("success", "Copied to clipboard!");
	// 	})
	// 	.catch((err) => {
	// 		showStatus("error", `Failed to copy: ${err.message}`);
	// 	});
}

function updateExportPreview() {
	if (!appState.optimizedResult) return;

	const parser = new RaidHelperParser();
	// const text = parser.exportToText(
	// 	appState.optimizedResult.raid,
	// 	appState.optimizedResult.groups
	// );

	// document.getElementById("export-preview-text").textContent = text;
}

// Status Messages
function showStatus(type, message) {
	const statusDiv = document.getElementById("optimization-status");
	statusDiv.className = `status-message ${type}`;
	statusDiv.textContent = message;
	statusDiv.classList.remove("hidden");

	setTimeout(() => {
		statusDiv.classList.add("hidden");
	}, 5000);
}
