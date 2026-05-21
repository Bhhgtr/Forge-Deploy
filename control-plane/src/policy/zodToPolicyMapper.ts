import type { PolicyViolation } from "./policyTypes.js";
import type * as z from "zod";

export function mapZodIssuesToPolicyViolations(
  issues: z.core.$ZodIssue[],
  service: string,
): PolicyViolation[] {
  return issues.map((issue) => {
    const field = issue.path.join(".");

    let violationType: PolicyViolation["type"];

    switch (field) {
      case "owner":
        violationType = "missing-owner";
        break;

      case "slos":
        violationType = "missing-slo";
        break;

      case "rollbackStrategy":
        violationType = "missing-rollback-strategy";
        break;

      case "deploymentStrategy":
        violationType = "no-canary-strategy";
        break;

      default:
        violationType = "restricted-window";
    }

    return {
      type: violationType,
      service,
      message: `Invalid or missing field: ${field}`,
      blocking: true,
      detectedAt: new Date().toISOString(),
    };
  });
}
