class RaidHelperAPI {
	constructor(serverId, apiKey) {
		this.serverId = serverId;
		this.apiKey = apiKey;
	}

	async _fetch(url, options = undefined) {
		try {
			const response = await fetch(url, options);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error("Error fetching data:", error);
			throw error;
		}
	}

	/**
	 * Fetch a specific event by ID (no auth required)
	 * This endpoint returns full event data with signUps array
	 * @param eventId: Event ID from Raid Helper for a specific Event
	 * @returns: Full event data JSON
	 */
	async fetchEventData(eventId) {
		const url = `https://raid-helper.dev/api/v2/events/${eventId}`;
		const data = await this._fetch(url);

		// Transform signUps to raidDrop format for parser compatibility
		return this.transformEventData(data);
	}

	/**
	 * Fetch all events for the configured server (requires auth)
	 * @returns: Array of event objects with general data
	 */
	async fetchAllEvents() {
		const url = `https://raid-helper.dev/api/v3/servers/${this.serverId}/events`;
		return this._fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: this.apiKey,
			},
		});
	}

	/**
	 * Fetch all scheduled events for the configured server (requires auth)
	 * @returns: Array of scheduled event objects
	 */
	async fetchScheduledEvents() {
		const url = `https://raid-helper.dev/api/v3/servers/${this.serverId}/scheduledevents`;
		return this._fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: this.apiKey,
			},
		});
	}

	/**
	 * Transform event data from Raid Helper API format to parser-compatible format
	 * Converts signUps array to raidDrop format
	 */
	transformEventData(eventData) {
		if (!eventData.signUps || !Array.isArray(eventData.signUps)) {
			console.warn("No signUps array found in event data");
			return eventData;
		}

		// Keep all signups including "Absence" entries so we can see everyone at a glance
		const validSignups = eventData.signUps;

		// Transform signUps to raidDrop format expected by parser
		const raidDrop = validSignups.map((signup) => ({
			userid: signup.userId,
			name: signup.name,
			class: signup.className,
			spec: signup.specName,
			spec1: signup.specName,
			signuptime: signup.entryTime,
			isConfirmed: signup.status === "primary",
			note: "", // Not provided in this API response
			partyId: null, // Not provided in this API response
			slotId: signup.position,
		}));

		// Return transformed data with both original and transformed format
		return {
			...eventData,
			raidDrop: raidDrop,
			// Keep metadata for reference
			partyPerRaid: 8, // Default for 40-man raids
			slotPerParty: 5,
			_id: eventData.id,
		};
	}

	/**
	 * Helper to format event date
	 */
	formatEventDate(timestamp) {
		if (!timestamp) return "No date";
		const date = new Date(timestamp * 1000); // Convert Unix timestamp to JS Date
		return date.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	/**
	 * Helper to get event status
	 */
	getEventStatus(event) {
		const now = Math.floor(Date.now() / 1000);
		if (event.startTime < now && event.endTime > now) {
			return "active";
		} else if (event.endTime < now) {
			return "ended";
		} else {
			return "upcoming";
		}
	}
}

module.exports = { RaidHelperAPI };
