
import type { ServiceDefinition } from "../catalog/serviceDefiniton.js";
import { evaluateServicePolicies } from "./policyEngine.js";
import type { PolicyViolation } from "./policyTypes.js";

export interface BudgetState {
  total: number;
  remaining: number;
  burnRate: number;
}

export interface PromotionGateResult {
  allowed: boolean;
  violations: PolicyViolation[];
}

const MIN_REMAINING_PERCENTAGE = 0.01; // 5% safety margin
const MAX_ALLOWED_BURN_RATE = 5; // 2x burn rate threshold

export function evaluatePromotion(
  service: ServiceDefinition,
  budget: BudgetState,
): PromotionGateResult {
  const violations: PolicyViolation[] = [];

  const structural = evaluateServicePolicies(service, true);

  violations.push(...structural);

  const remainingPercentage = budget.remaining / budget.total;

  if (budget.remaining <= 0) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: "Error budget exhausted - production freeze active",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (remainingPercentage < MIN_REMAINING_PERCENTAGE) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: `Remaining budget below safety threshold (${MIN_REMAINING_PERCENTAGE * 100}%)`,
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (budget.burnRate >= MAX_ALLOWED_BURN_RATE) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: `Burn rate too high (${budget.burnRate}x) — risky to deploy`,
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  const blocking = violations.filter((v) => v.blocking);

  return {
    allowed: blocking.length === 0,
    violations,
  };
}