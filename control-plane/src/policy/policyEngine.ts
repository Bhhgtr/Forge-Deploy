
import type { ServiceDefinition } from "../catalog/serviceDefiniton.js";
import type { PolicyViolation } from "./policyTypes.js";

export function evaluateServicePolicies(
  service: ServiceDefinition,
  errorBudgetHealthy: boolean,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  if (!service.owner) {
    violations.push({
      type: "missing-owner",
      service: service.name,
      message: "Service owner not defined",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!service.slos?.length) {
    violations.push({
      type: "missing-slo",
      service: service.name,
      message: "No SLOs defined for the service",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!service.rollbackStrategy) {
    violations.push({
      type: "missing-rollback-strategy",
      service: service.name,
      message: "No rollback strategy defined for the service",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!errorBudgetHealthy) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: "Error budget exhausted - promotion blocked",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (service.deploymentStrategy !== "canary") {
    violations.push({
      type: "no-canary-strategy",
      service: service.name,
      message: "Service must use canary deployment strategy",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  return violations;
}