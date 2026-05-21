import { approveProposal } from "../actions/approveProposal.js";
import { loadIncidents, saveIncident } from "../incidents/store.js";
import { transitionIncident } from "../incidents/lifecycle.js";
import { prepareRollbackCommit } from "../actions/git/prepareRollbackCommit.js";
import { appendAudit } from "../audit/store.js";
import { createRollbackPR } from "../actions/git/createRollbackPr.js";

export async function handleProposalApproval(
  proposalId: string,
): Promise<void> {
  const proposal = approveProposal(proposalId);

  if (proposal.status !== "approved") {
    return;
  }

  appendAudit("proposals", {
    type: "proposal-approved",
    proposalId: proposal.id,
    incidentId: proposal.incidentId,
    approvedBy: "user",
    timestamp: new Date().toISOString(),
  });

  const incidents = loadIncidents();
  const incident = incidents.find((i) => i.id === proposal.incidentId);

  if (!incident) {
    throw new Error("Incident not found for proposal");
  }

  if (incident.currentState !== "investigating") {
    return;
  }

  const branchName = `rollback-${proposal.incidentId}`;
  const imageTag = "55fccf8";

  await prepareRollbackCommit(imageTag, branchName);

  const prUrl = await createRollbackPR(
    branchName,
    `Rollback ${proposal.incidentId}`,
    "Automated rollback proposal",
    `Triggered by proposal ${proposal.id}`,
  );

  console.log("PR created:", prUrl);

  const mitigated = transitionIncident(
    incident,
    "mitigated",
    `Rollback PR created: ${prUrl}`,
    "user",
  );

  saveIncident(mitigated);

  appendAudit("proposals", {
    type: "proposal-approved",
    proposalId: proposal.id,
    incidentId: proposal.incidentId,
    approvedBy: "user",
    timestamp: new Date().toISOString(),
  });
}