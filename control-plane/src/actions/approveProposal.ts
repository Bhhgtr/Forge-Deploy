import { loadProposals, updateProposal } from "./store.js";
import type { ActionProposal } from "./proposal.js";

export function approveProposal(id: string): ActionProposal {
  const proposals = loadProposals();
  const proposal = proposals.find((p) => p.id === id);

  if (!proposal) {
    throw new Error("Proposal not found");
  }

  if (proposal.status !== "proposed") {
    return proposal; // already approved or rejected
  }

  proposal.status = "approved";

  updateProposal(proposal);

  return proposal;
}
