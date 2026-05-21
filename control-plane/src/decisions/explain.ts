import type { BurnRateSeverity } from "./burnRate.js";

export function explainBurnDecision(severity: BurnRateSeverity): string {
  switch (severity) {
    case "fast-burn":
      return "Error budget is being consumed at a critical rate; immediate user impact likely.";
    case "slow-burn":
      return "Error budget consumption exceeds sustainable rate; monitor closely.";
    case "exhausted":
      return "Error budget exhausted; service is operating outside SLO.";
    default:
      return "Service operating within SLO.";
  }
}
