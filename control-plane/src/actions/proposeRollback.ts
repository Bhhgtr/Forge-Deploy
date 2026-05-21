import { logger } from "../../../lib/logger.js";
import { appendAudit } from "../audit/store.js";
import type { Incident } from "../incidents/incident.js";
import type { ErrorBudget } from "../slo/errorBudget.js";
import type { ActionProposal } from "./proposal.js";
import { loadProposals, saveProposal } from "./store.js";

export function proposeRollback(
  incident: Incident,
  budget: ErrorBudget,
  explanation: string,
): ActionProposal {
  const existing = loadProposals().find(
    (p) =>
      p.incidentId === incident.id &&
      p.type === "rollback-rollout" &&
      p.status === "proposed",
  );

  if (existing) {
    logger.info(
      { proposalId: existing.id, incidentId: incident.id },
      "Rollback proposal already exists — returning existing",
    );

    appendAudit("proposals", {
      type: "proposal-reused",
      proposalId: existing.id,
      incidentId: incident.id,
      action: existing.type,
    });

    return existing;
  }

  const proposal: ActionProposal = {
    id: `proposal-${Date.now()}`,
    incidentId: incident.id,
    type: "rollback-rollout",
    createdAt: new Date().toISOString(),
    status: "proposed",
    justification: {
      severity: incident.severity,
      explanation,
      evidence: {
        slo: "latency-p95-300ms",
        burnRate: budget.burnRate,
        remainingBudget: budget.remaining,
      },
    },
  };

  saveProposal(proposal);

  appendAudit("proposals", {
    type: "proposal-created",
    proposalId: proposal.id,
    incidentId: proposal.incidentId,
    service: incident.service,
    action: proposal.type,
    status: proposal.status,
    justification: proposal.justification,
  });

  logger.info(
    { proposalId: proposal.id, incidentId: incident.id },
    "Rollback proposed",
  );

  return proposal;
}
