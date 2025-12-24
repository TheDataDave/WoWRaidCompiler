// Raid Comp Tool State Management
const raidCompState = {
	members: [],
	groups: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, members: [] })),
	history: [],
	historyIndex: -1,
	maxHistory: 50,
	changes: [],
	currentEditMember: null,
	filters: {
		signup: true,
		tentative: true,
		bench: true,
		late: true,
		absent: true,
	},
};

// Initialize Raid Comp Tool
function initializeRaidCompTool() {
	// Event listeners for raid comp buttons
	document
		.getElementById("refresh-members-btn")
		.addEventListener("click", refreshMemberData);
	document
		.getElementById("import-rh-json-btn")
		.addEventListener("click", openImportModal);
	document.getElementById("undo-btn").addEventListener("click", undo);
	document.getElementById("redo-btn").addEventListener("click", redo);
	document
		.getElementById("save-state-btn")
		.addEventListener("click", saveState);
	document
		.getElementById("load-state-btn")
		.addEventListener("click", loadState);

	// Filter checkboxes
	document.querySelectorAll(".status-filter").forEach((checkbox) => {
		checkbox.addEventListener("change", (e) => {
			raidCompState.filters[e.target.value] = e.target.checked;
			renderMembers();
		});
	});
}

// Load members into raid comp tool when event is loaded
function loadMembersToRaidComp(eventData) {
	if (!eventData || !eventData.signUps) {
		console.warn("No event data or signUps available");
		return;
	}

	// Transform signUps to member format
	raidCompState.members = eventData.signUps.map((signup) => ({
		id: signup.userId || signup.name,
		name: signup.name,
		class: signup.className,
		spec: signup.specName,
		status: getStatusFromSignup(signup),
		groupId: null,
		originalData: signup,
	}));

	// Clear groups
	raidCompState.groups = Array.from({ length: 8 }, (_, i) => ({
		id: i + 1,
		members: [],
	}));

	// Reset history
	raidCompState.history = [];
	raidCompState.historyIndex = -1;
	raidCompState.changes = [];

	// Save initial state
	saveToHistory();

	// Enable buttons
	enableRaidCompButtons();

	// Render
	renderRaidComp();

	// Show container
	document.getElementById("raidcomp-container").classList.remove("hidden");

	showRaidCompStatus(
		"success",
		`Loaded ${raidCompState.members.length} members from event`
	);
}

function getStatusFromSignup(signup) {
	// Map Raid Helper status to our status
	if (signup.className === "Absence") return "absence";
	if (signup.status === "primary") return "signup";
	if (signup.status === "backup") return "bench";
	if (signup.status === "tentative") return "tentative";
	if (signup.status === "late") return "late";
	if (signup.status === "bench") return "bench";
	return "signup"; // default
}

function enableRaidCompButtons() {
	document.getElementById("refresh-members-btn").disabled = false;
	document.getElementById("import-rh-json-btn").disabled = false;
	document.getElementById("save-state-btn").disabled = false;
	document.getElementById("load-state-btn").disabled = false;
	updateUndoRedoButtons();
}

function renderRaidComp() {
	renderMembers();
	renderGroups();
}

function renderMembers() {
	const membersList = document.getElementById("members-list");
	membersList.innerHTML = "";

	// Filter members not in groups and by status
	const availableMembers = raidCompState.members.filter(
		(m) => !m.groupId && raidCompState.filters[m.status]
	);

	if (availableMembers.length === 0) {
		membersList.innerHTML =
			'<p style="color: #888; text-align: center; padding: 1rem;">No available members</p>';
		return;
	}

	availableMembers.forEach((member) => {
		const memberEl = createMemberElement(member);
		membersList.appendChild(memberEl);
	});
}

function createMemberElement(member) {
	const div = document.createElement("div");
	div.className = "member-item";
	div.draggable = true;
	div.dataset.memberId = member.id;

	div.innerHTML = `
        <div class="member-info">
            <div class="member-name">${member.name}</div>
            <div class="member-details">${member.class} - ${
		member.spec || "Unknown"
	}</div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="member-status ${member.status}">${member.status}</span>
            <button class="member-edit-btn" onclick="openEditModal('${
				member.id
			}')">✏️</button>
        </div>
    `;

	// Drag events
	div.addEventListener("dragstart", handleDragStart);
	div.addEventListener("dragend", handleDragEnd);

	return div;
}

function renderGroups() {
	const groupsContainer = document.getElementById("raid-groups");
	groupsContainer.innerHTML = "";

	raidCompState.groups.forEach((group) => {
		const groupEl = createGroupElement(group);
		groupsContainer.appendChild(groupEl);
	});
}

function createGroupElement(group) {
	const div = document.createElement("div");
	div.className = "raid-group";
	div.dataset.groupId = group.id;

	const groupMembers = raidCompState.members.filter(
		(m) => m.groupId === group.id
	);

	div.innerHTML = `
        <div class="group-header">
            <span>Group ${group.id}</span>
            <span class="group-count">${groupMembers.length}/5</span>
        </div>
        <div class="group-members" id="group-${group.id}-members">
            ${
				groupMembers.length === 0
					? '<p style="color: #666; font-size: 0.85rem; text-align: center;">Drop members here</p>'
					: ""
			}
        </div>
    `;

	const membersContainer = div.querySelector(".group-members");

	groupMembers.forEach((member) => {
		const memberEl = createGroupMemberElement(member);
		membersContainer.appendChild(memberEl);
	});

	// Drop events
	div.addEventListener("dragover", handleDragOver);
	div.addEventListener("drop", (e) => handleDrop(e, group.id));
	div.addEventListener("dragleave", handleDragLeave);

	return div;
}

function createGroupMemberElement(member) {
	const div = document.createElement("div");
	div.className = "group-member";
	div.draggable = true;
	div.dataset.memberId = member.id;

	div.innerHTML = `
        <div class="group-member-info">
            <div class="group-member-name">${member.name}</div>
            <div class="group-member-class">${member.class} - ${
		member.spec || "Unknown"
	}</div>
        </div>
        <button class="group-member-remove" onclick="removeMemberFromGroup('${
			member.id
		}')">×</button>
    `;

	// Drag events
	div.addEventListener("dragstart", handleDragStart);
	div.addEventListener("dragend", handleDragEnd);

	return div;
}

// Drag and Drop Handlers
let draggedMemberId = null;

function handleDragStart(e) {
	draggedMemberId = e.target.dataset.memberId;
	e.target.classList.add("dragging");
	e.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(e) {
	e.target.classList.remove("dragging");
	draggedMemberId = null;
}

function handleDragOver(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = "move";
	e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
	if (e.currentTarget === e.target) {
		e.currentTarget.classList.remove("drag-over");
	}
}

function handleDrop(e, groupId) {
	e.preventDefault();
	e.currentTarget.classList.remove("drag-over");

	if (!draggedMemberId) return;

	const member = raidCompState.members.find((m) => m.id === draggedMemberId);
	if (!member) return;

	// Check if group is full
	const groupMembers = raidCompState.members.filter(
		(m) => m.groupId === groupId
	);
	if (groupMembers.length >= 5 && member.groupId !== groupId) {
		showRaidCompStatus("error", "Group is full (max 5 members)");
		return;
	}

	// Move member to group
	const oldGroupId = member.groupId;
	member.groupId = groupId;

	// Save to history
	saveToHistory();

	// Log change
	logChange("modified", `${member.name} moved to Group ${groupId}`);

	// Re-render
	renderRaidComp();
}

function removeMemberFromGroup(memberId) {
	const member = raidCompState.members.find((m) => m.id === memberId);
	if (!member) return;

	member.groupId = null;

	// Save to history
	saveToHistory();

	// Log change
	logChange("modified", `${member.name} removed from group`);

	// Re-render
	renderRaidComp();
}

// State Management
function saveToHistory() {
	// Remove any states after current index
	raidCompState.history = raidCompState.history.slice(
		0,
		raidCompState.historyIndex + 1
	);

	// Add current state
	const state = {
		members: JSON.parse(JSON.stringify(raidCompState.members)),
		groups: JSON.parse(JSON.stringify(raidCompState.groups)),
	};

	raidCompState.history.push(state);

	// Limit history size
	if (raidCompState.history.length > raidCompState.maxHistory) {
		raidCompState.history.shift();
	} else {
		raidCompState.historyIndex++;
	}

	updateUndoRedoButtons();
}

function undo() {
	if (raidCompState.historyIndex <= 0) return;

	raidCompState.historyIndex--;
	restoreState(raidCompState.history[raidCompState.historyIndex]);
	updateUndoRedoButtons();
	renderRaidComp();
}

function redo() {
	if (raidCompState.historyIndex >= raidCompState.history.length - 1) return;

	raidCompState.historyIndex++;
	restoreState(raidCompState.history[raidCompState.historyIndex]);
	updateUndoRedoButtons();
	renderRaidComp();
}

function restoreState(state) {
	raidCompState.members = JSON.parse(JSON.stringify(state.members));
	raidCompState.groups = JSON.parse(JSON.stringify(state.groups));
}

function updateUndoRedoButtons() {
	const undoBtn = document.getElementById("undo-btn");
	const redoBtn = document.getElementById("redo-btn");

	undoBtn.disabled = raidCompState.historyIndex <= 0;
	redoBtn.disabled =
		raidCompState.historyIndex >= raidCompState.history.length - 1;
}

// Save/Load State
function saveState() {
	const state = {
		members: raidCompState.members,
		groups: raidCompState.groups,
		timestamp: new Date().toISOString(),
	};

	const json = JSON.stringify(state, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `raid-comp-${Date.now()}.json`;
	a.click();
	URL.revokeObjectURL(url);

	showRaidCompStatus("success", "State saved successfully");
}

function loadState() {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json";
	input.onchange = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const state = JSON.parse(event.target.result);
				raidCompState.members = state.members;
				raidCompState.groups = state.groups;

				// Reset history
				raidCompState.history = [];
				raidCompState.historyIndex = -1;
				saveToHistory();

				renderRaidComp();
				showRaidCompStatus("success", "State loaded successfully");
			} catch (error) {
				showRaidCompStatus(
					"error",
					"Failed to load state: Invalid JSON"
				);
			}
		};
		reader.readAsText(file);
	};
	input.click();
}

// Refresh Data
async function refreshMemberData() {
	if (!appState.selectedEvent || !appState.api) {
		showRaidCompStatus("error", "No event selected");
		return;
	}

	try {
		showRaidCompStatus("info", "Refreshing data...");

		// Fetch fresh event data
		const eventData = await appState.api.fetchEventData(
			appState.selectedEvent.id
		);

		// Store old members for comparison
		const oldMembers = new Map(raidCompState.members.map((m) => [m.id, m]));

		// Update members
		const newMembers = eventData.signUps.map((signup) => ({
			id: signup.userId || signup.name,
			name: signup.name,
			class: signup.className,
			spec: signup.specName,
			status: getStatusFromSignup(signup),
			groupId:
				oldMembers.get(signup.userId || signup.name)?.groupId || null,
			originalData: signup,
		}));

		// Detect changes
		const changes = [];

		// Check for new members
		newMembers.forEach((newMember) => {
			const oldMember = oldMembers.get(newMember.id);
			if (!oldMember) {
				changes.push(`➕ ${newMember.name} signed up`);
			} else {
				// Check for changes
				if (oldMember.class !== newMember.class) {
					changes.push(
						`🔄 ${newMember.name} changed class: ${oldMember.class} → ${newMember.class}`
					);
				}
				if (oldMember.spec !== newMember.spec) {
					changes.push(
						`🔄 ${newMember.name} changed spec: ${oldMember.spec} → ${newMember.spec}`
					);
				}
				if (oldMember.status !== newMember.status) {
					changes.push(
						`🔄 ${newMember.name} status changed: ${oldMember.status} → ${newMember.status}`
					);
				}
			}
		});

		// Check for removed members
		oldMembers.forEach((oldMember, id) => {
			if (!newMembers.find((m) => m.id === id)) {
				changes.push(`➖ ${oldMember.name} removed from event`);
			}
		});

		raidCompState.members = newMembers;

		// Save to history
		saveToHistory();

		// Log changes
		if (changes.length > 0) {
			changes.forEach((change) => logChange("modified", change));
			showRaidCompStatus(
				"success",
				`Refreshed! ${changes.length} change(s) detected`
			);
		} else {
			showRaidCompStatus("success", "Refreshed! No changes detected");
		}

		renderRaidComp();
		renderChangeLog();
	} catch (error) {
		console.error("Error refreshing data:", error);
		showRaidCompStatus("error", `Failed to refresh: ${error.message}`);
	}
}

// Import Raid Helper JSON
function openImportModal() {
	document.getElementById("import-modal").classList.add("active");
}

function closeImportModal() {
	document.getElementById("import-modal").classList.remove("active");
	document.getElementById("import-json-textarea").value = "";
}

function processImportJSON() {
	const jsonText = document.getElementById("import-json-textarea").value;

	try {
		const data = JSON.parse(jsonText);

		// Process imported data
		// This assumes Raid Helper format - adjust as needed
		if (data.groups && Array.isArray(data.groups)) {
			// Import group assignments
			data.groups.forEach((group, index) => {
				if (group.members && Array.isArray(group.members)) {
					group.members.forEach((memberData) => {
						const member = raidCompState.members.find(
							(m) =>
								m.name === memberData.name ||
								m.id === memberData.id
						);
						if (member) {
							member.groupId = index + 1;
						}
					});
				}
			});
		}

		// Save to history
		saveToHistory();

		// Log change
		logChange("modified", "Imported Raid Helper composition data");

		renderRaidComp();
		closeImportModal();
		showRaidCompStatus("success", "Successfully imported composition data");
	} catch (error) {
		showRaidCompStatus("error", "Failed to import: Invalid JSON format");
	}
}

// Edit Member
function openEditModal(memberId) {
	const member = raidCompState.members.find((m) => m.id === memberId);
	if (!member) return;

	raidCompState.currentEditMember = member;

	document.getElementById("edit-member-name").value = member.name;
	document.getElementById("edit-member-class").value = member.class;
	document.getElementById("edit-member-spec").value = member.spec || "";
	document.getElementById("edit-member-status").value = member.status;

	document.getElementById("edit-member-modal").classList.add("active");
}

function closeEditModal() {
	document.getElementById("edit-member-modal").classList.remove("active");
	raidCompState.currentEditMember = null;
}

function saveEditedMember() {
	if (!raidCompState.currentEditMember) return;

	const member = raidCompState.currentEditMember;
	const oldName = member.name;

	member.name = document.getElementById("edit-member-name").value;
	member.class = document.getElementById("edit-member-class").value;
	member.spec = document.getElementById("edit-member-spec").value;
	member.status = document.getElementById("edit-member-status").value;

	// Save to history
	saveToHistory();

	// Log change
	logChange(
		"modified",
		`Edited ${oldName}: ${member.class} - ${member.spec}`
	);

	renderRaidComp();
	closeEditModal();
	showRaidCompStatus("success", "Member updated successfully");
}

// Change Log
function logChange(type, message) {
	raidCompState.changes.unshift({
		type,
		message,
		timestamp: new Date().toISOString(),
	});

	// Keep only last 50 changes
	if (raidCompState.changes.length > 50) {
		raidCompState.changes = raidCompState.changes.slice(0, 50);
	}

	renderChangeLog();
}

function renderChangeLog() {
	const changeLogContent = document.getElementById("change-log-content");
	const changeLog = document.getElementById("change-log");

	if (raidCompState.changes.length === 0) {
		changeLog.classList.add("hidden");
		return;
	}

	changeLog.classList.remove("hidden");
	changeLogContent.innerHTML = "";

	raidCompState.changes.slice(0, 10).forEach((change) => {
		const div = document.createElement("div");
		div.className = `change-item ${change.type}`;

		const time = new Date(change.timestamp).toLocaleTimeString();

		div.innerHTML = `
            <div>${change.message}</div>
            <div class="change-timestamp">${time}</div>
        `;

		changeLogContent.appendChild(div);
	});
}

// Status Messages
function showRaidCompStatus(type, message) {
	const statusDiv = document.getElementById("raidcomp-status");
	statusDiv.className = `status-message ${type}`;
	statusDiv.textContent = message;
	statusDiv.classList.remove("hidden");

	setTimeout(() => {
		statusDiv.classList.add("hidden");
	}, 5000);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeRaidCompTool);
} else {
	initializeRaidCompTool();
}
