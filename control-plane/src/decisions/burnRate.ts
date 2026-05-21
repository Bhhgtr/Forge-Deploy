export type BurnRateSeverity =
  | "normal"
  | "slow-burn"
  | "fast-burn"
  | "exhausted";

export function evaluateBurnRate(instantBurnRate: number): BurnRateSeverity {
  if (instantBurnRate > 4) {
    return "exhausted";
  }

  if (instantBurnRate > 2) {
    return "fast-burn";
  }

  if (instantBurnRate > 1) {
    return "slow-burn";
  }

  return "normal";
}
