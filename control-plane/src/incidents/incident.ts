export type IncidentState = 
	| "detected"
	| "investigating"
	| "mitigated"
	| "resolved"
	| "postmortem-complete";

export interface IncidentEvent {
	from: IncidentState;
	to: IncidentState;
	at: string; // ISO timestamp
	triggeredBy: "system" | "user";
	reason: string;
}

export interface Incident {
	id: string;
	service: string;
	severity: string;
	currentState: IncidentState;
	timeline: IncidentEvent[];
	createdAt: string;
}