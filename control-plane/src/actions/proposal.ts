export type ActionType =
  | "rollback-rollout"
  | "pause-canary"
  | "block-promotion";

export interface ActionProposal {
  id: string;
  incidentId: string;
  type: ActionType;
  createdAt: string;

  justification: {
    severity: string;
    explanation: string;
    evidence: {
      slo: string;
      burnRate: number;
      remainingBudget: number;
    };
  };
  status: "proposed" | "approved" | "rejected";
}
