import type { Incident, IncidentState } from "./incident.js";

export function transitionIncident(
	incident: Incident,
	next: IncidentState,
	reason: string,
	triggeredBy: "system" | "user"
): Incident {
	const event = {
		from: incident.currentState,
		to: next,
		at: new Date().toISOString(),
		triggeredBy,
		reason,
	};
	return {
		...incident,
		currentState: next,
		timeline: [...incident.timeline, event],
	};
}