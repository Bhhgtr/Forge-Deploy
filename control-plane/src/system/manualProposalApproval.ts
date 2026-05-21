import { handleProposalApproval } from "./handleProposalApproval.js";

const proposalId = process.argv[2];

if (!proposalId) {
  console.error("Provide proposal ID");
  process.exit(1);
}

try {
  await handleProposalApproval(proposalId);
  console.log("Approval handled successfully");
} catch (error) {
  console.error("Approval failed:", error);
  process.exit(1);
}
