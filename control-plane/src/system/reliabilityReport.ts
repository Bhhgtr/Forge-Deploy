import { loadCatalog } from "../catalog/catalogStore.js";
import { loadIncidents } from "../incidents/store.js";
import { loadBudgetWindow } from "../budget-state/store.js";
import { loadServiceHealthState } from "../health-state/store.js";
import { loadProposals } from "../actions/store.js";

export function generateReliabilityReport(): any {
  const services = loadCatalog();
  const incidents = loadIncidents();
  const proposals = loadProposals();

  return services.map((service) => {
    const budget = loadBudgetWindow(service.name);
    const health = loadServiceHealthState(service.name);

    const activeIncident = incidents.find(
      (i) =>
        i.service === service.name &&
        !["resolved", "postmortem-complete"].includes(i.currentState),
    );

    const activeProposals = proposals.filter(
      (p) =>
        p.status === "proposed" &&
        incidents.some(
          (i) => i.id === p.incidentId && i.service === service.name,
        ),
    );

    return {
      service: service.name,
      owner: service.owner,
      budget: budget
        ? {
            allowed: budget.allowed,
            consumed: budget.consumedSoFar,
            remaining: budget.allowed - budget.consumedSoFar,
            windowStart: budget.windowStart,
          }
        : null,
      freeze: {
        active:
          health?.freezeUntil &&
          new Date(health.freezeUntil).getTime() > Date.now(),
        freezeUntil: health?.freezeUntil ?? null,
      },
      activeIncident: activeIncident
        ? {
            id: activeIncident.id,
            state: activeIncident.currentState,
            severity: activeIncident.severity,
          }
        : null,
      activeProposals: activeProposals.map((p) => ({
        id: p.id,
        type: p.type,
        status: p.status,
      })),
    };
  });
}

console.log(JSON.stringify(generateReliabilityReport(), null, 2));
