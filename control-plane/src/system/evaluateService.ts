import { logger } from "../../../lib/logger.js";
import { saveBudgetWindow } from "../budget-state/store.js";
import { evaluateBurnRate } from "../decisions/burnRate.js";
import { explainBurnDecision } from "../decisions/explain.js";
import { initializeOrRotateWindow } from "../helper/initializeBudgetWindow.js";
import { queryPrometheus } from "../observability/prometheus.js";
import type { ErrorBudget } from "../slo/errorBudget.js";
import { DEMO_APP_SLIS } from "../slo/sli.js";
import { DEMO_APP_SLOS } from "../slo/slo.js";

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

  return {
    budget,
    newIncidentCreated: false, // or true if you track incident creation above
  };
}