import { logger } from "../../../lib/logger.js";
import type { Incident } from "../incidents/incident.js";
import { transitionIncident } from "../incidents/lifecycle.js";
import { saveIncident } from "../incidents/store.js";
import type { PolicyViolation } from "../policy/policyTypes.js";

export function createPolicyViolationIncident(
  violations: PolicyViolation[],
): Incident {
  const incident: Incident = {
    id: `incident-policy-${Date.now()}`,
    service: violations[0]!.service,
    severity: "policy-violation",
    currentState: "detected",
    timeline: [],
    createdAt: new Date().toISOString(),
  };

  const investigating = transitionIncident(
    incident,
    "investigating",
    JSON.stringify(violations),
    "system",
  );

  saveIncident(investigating);

  logger.warn({
    message: `[POLICY INCIDENT] ${investigating.id} created`,
  });

  return investigating;
}
