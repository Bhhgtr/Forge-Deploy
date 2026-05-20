import { ZodError } from "zod";
import { logger } from "../../../lib/logger.js";
import { proposeBlockPromotion } from "../actions/proposeBlockPromotion.js";
import { proposeRollback } from "../actions/proposeRollback.js";
import { appendAudit } from "../audit/store.js";
import { saveBudgetWindow } from "../budget-state/store.js";
import { loadService } from "../catalog/catalogStore.js";
import type { ServiceDefinition } from "../catalog/serviceDefiniton.js";
import { evaluateBurnRate } from "../decisions/burnRate.js";
import { explainBurnDecision } from "../decisions/explain.js";
import { loadServiceHealthState } from "../health-state/store.js";
import { createPolicyViolationIncident } from "../helper/createPolicyViolation.js";
import { initializeOrRotateWindow } from "../helper/initializeBudgetWindow.js";
import type { Incident } from "../incidents/incident.js";
import { transitionIncident } from "../incidents/lifecycle.js";
import { loadIncidents, saveIncident } from "../incidents/store.js";
import { queryPrometheus } from "../observability/prometheus.js";
import type { PolicyViolation } from "../policy/policyTypes.js";
import { evaluatePromotion } from "../policy/promotionGate.js";
import type { ErrorBudget } from "../slo/errorBudget.js";
import { DEMO_APP_SLIS } from "../slo/sli.js";
import { DEMO_APP_SLOS } from "../slo/slo.js";
import { mapZodIssuesToPolicyViolations } from "../policy/zodToPolicyMapper.js";

async function evaluateRuntimeHealth(): Promise<{
  budget: ErrorBudget;
  newIncidentCreated: boolean;
}> {

  const latencySLI = DEMO_APP_SLIS.find(
    (s) => s.name === "request_latency_p95",
  );

  const latencySLO = DEMO_APP_SLOS.find((s) => s.name === "latency-p95-300ms");

  if (!latencySLI || !latencySLO) {
    throw new Error("Latency SLI/SLO not found");
  }

  const latencyResult = await queryPrometheus(latencySLI.promQuery);

  let latencyMs = 0;

  if (latencyResult?.length) {
    latencyMs = Number(latencyResult[0].value[1]) * 1000;
  }

  const availabilitySLO = DEMO_APP_SLOS.find(
    (s) => s.name === "availability-99.9",
  );

  if (!availabilitySLO) {
    throw new Error("Availability SLO not found");
  }

  const totalRequests = 10000;
  let simulatedFailures = 0;

  if (latencyMs > latencySLO.target) {
    const factor = latencyMs / latencySLO.target;

    if (factor > 2) simulatedFailures = 200;
    else if (factor > 1.5) simulatedFailures = 50;
    else simulatedFailures = 10;
  }

  appendAudit("metrics", {
    service: "demo-app",
    metric: "request_latency_p95",
    observedLatencyMs: latencyMs,
    targetMs: latencySLO.target,
  });

  const allowedBadEvents = totalRequests * (1 - availabilitySLO.target);

  const windowDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days

  const window = initializeOrRotateWindow(
    "demo-app",
    allowedBadEvents,
    windowDurationMs,
  );

  // Failures detected this cycle
  const cycleFailures = simulatedFailures;

  window.consumedSoFar += cycleFailures;

  if (window.consumedSoFar > window.allowed) {
    window.consumedSoFar = window.allowed;
  }

  saveBudgetWindow(window);

  const remainingBudget = window.allowed - window.consumedSoFar;

  const instantBurnRate = cycleFailures / (window.allowed * (1 / 6));

  const cumulativeBurnRate = window.consumedSoFar / (window.allowed * (1 / 6));

  const budget: ErrorBudget = {
    total: window.allowed,
    remaining: remainingBudget,
    burnRate: cumulativeBurnRate,
    consumed: window.consumedSoFar,
  };

  const severity = evaluateBurnRate(instantBurnRate);

  let explanation = explainBurnDecision(severity);

  if (severity === "normal" && budget.remaining <= 0) {
    explanation =
      "Current SLI healthy, but error budget exhausted (SLO violated).";
  }

  logger.info({
    message: explanation,
    severity,
    latencyMs,
    burnRate: Number(budget.burnRate.toFixed(2)),
    remainingBudget: budget.remaining,
    totalBudget: budget.total,
  });

  appendAudit("budget", {
    service: "demo-app",
    total: budget.total,
    remaining: budget.remaining,
    consumed: budget.consumed,
    burnRate: budget.burnRate,
    freezeUntil: loadServiceHealthState("demo-app")?.freezeUntil,
  });

const incidents = loadIncidents();
  const activeIncident = incidents.find(
    (i) =>
      i.service === "demo-app" &&
      i.severity === "exhausted" &&
      !["resolved", "postmortem-complete"].includes(i.currentState),
  );

  let newIncidentCreated = false;

  if (
    budget.remaining <= 0 &&
    severity === "exhausted" &&
    !activeIncident?.severity?.includes("policy")
  ) {

    if (!activeIncident) {
      newIncidentCreated = true;

      const incident: Incident = {
        id: `incident-${Date.now()}`,
        service: "demo-app",
        severity,
        currentState: "detected",
        timeline: [],
        createdAt: new Date().toISOString(),
      };

      const investigating = transitionIncident(
        incident,
        "investigating",
        explanation,
        "system",
      );

      saveIncident(investigating);

      appendAudit("incidents", {
        service: investigating.service,
        incidentId: investigating.id,
        state: investigating.currentState,
        severity: investigating.severity,
        timeline: investigating.timeline,
      });

      proposeRollback(investigating, budget, explanation);
    } else {
      proposeRollback(activeIncident, budget, explanation);
    }
  }

  if (severity === "normal") {
    const mitigatedIncident = incidents.find(
      (i) => i.service === "demo-app" && i.currentState === "mitigated",
    );

    if (mitigatedIncident) {
      const resolved = transitionIncident(
        mitigatedIncident,
        "resolved",
        "Availability SLO returned to healthy state",
        "system",
      );

      saveIncident(resolved);

      appendAudit("incidents", {
        service: resolved.service,
        incidentId: resolved.id,
        state: resolved.currentState,
        resolved: true,
      });
    }
  }

  return { budget, newIncidentCreated };
}

function evaluatePromotionEligibility(
  service: ServiceDefinition,
  budget: ErrorBudget,
): void {
  const now = new Date();

  const state = loadServiceHealthState(service.name);

  const violations: PolicyViolation[] = [];

  const remainingRatio = budget.total > 0 ? budget.remaining / budget.total : 0;

  // HARD STOP — Exhaustion
  if (budget.remaining <= 0) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: "No remaining error budget — SLO contract violated.",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  // SOFT FREEZE — <5% remaining
  if (remainingRatio > 0 && remainingRatio < 0.05) {
    violations.push({
      type: "error-budget-near-exhaustion",
      service: service.name,
      message: "Remaining budget below 5% safety threshold.",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  // TIME-BASED FREEZE
  if (state?.freezeUntil) {
    const freezeTime = new Date(state.freezeUntil).getTime();

    if (freezeTime > now.getTime()) {
      violations.push({
        type: "freeze-window-active",
        service: service.name,
        message: `Promotion frozen until ${state.freezeUntil}`,
        blocking: true,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  const gate = evaluatePromotion(service, {
    total: budget.total,
    remaining: budget.remaining,
    burnRate: budget.burnRate,
  });

  if (!gate.allowed) {
    violations.push(...gate.violations);
  }

  const existingPolicyIncident = loadIncidents().find(
    (i) =>
      i.service === service.name &&
      i.severity === "policy-violation" &&
      !["resolved", "postmortem-complete"].includes(i.currentState),
  );

  if (violations.length > 0) {
    logger.warn({
      message: "Governance blocking promotion",
      violations,
    });

    if (!existingPolicyIncident) {
      const policyIncident = createPolicyViolationIncident(violations);
      proposeBlockPromotion(
        policyIncident.id,
        service.name,
        violations,
        budget,
      );
    }
  }

}

export async function evaluateDemoService(): Promise<void> {
  let service;

  try {
    service = loadService("demo-app");
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const violations = mapZodIssuesToPolicyViolations(
        error.issues,
        "demo-app",
      );

      const policyIncident = createPolicyViolationIncident(violations);

      proposeBlockPromotion(policyIncident.id, "demo-app", violations, {
        total: 0,
        remaining: 0,
        burnRate: 0,
        consumed: 0,
      });

      return;
    }

    throw error;
  }

  const { budget, newIncidentCreated } = await evaluateRuntimeHealth();

  // Skip governance only on first detection cycle
  if (!newIncidentCreated) {
    evaluatePromotionEligibility(service, budget);
  }
}