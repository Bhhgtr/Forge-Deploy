export interface ErrorBudget {
  total: number;
  remaining: number;
  consumed: number;
  burnRate: number; // e.g., 0.01 for 1% burn rate
}

export function calculateErrorBudget(
  sloTarget: number,
  totalRequests: number,
  badEvents: number,
  timeWindowRatio: number,
): ErrorBudget {
  const allowedErrors = totalRequests * (1 - sloTarget);
  const consumedErrors = badEvents;
  const remainingErrors = Math.max(allowedErrors - consumedErrors, 0);

  const burnRate = consumedErrors / (allowedErrors * timeWindowRatio);

  return {
    total: allowedErrors,
    remaining: remainingErrors,
    consumed: consumedErrors,
    burnRate: burnRate,
  };
}

// =====================================================
// SIMULATION EXPLANATION (Full Budget Math Walkthrough)
// =====================================================
//
// Assumptions:
// - Availability SLO = 99.9%
// - totalRequests = 10,000 (evaluation reference volume)
// - Full SLO window = 30 days
// - timeWindowRatio = 1/6  → evaluating 5 days slice
//
// -----------------------------------------------------
// 1️. Full Error Budget Calculation (30-day window)
//
// allowedBadEvents = totalRequests × (1 - SLO)
//                  = 10,000 × (1 - 0.999)
//                  = 10,000 × 0.001
//                  = 10 failures
//
// Meaning:
// Over 30 days, we are allowed 10 failed requests.
//
// -----------------------------------------------------
// 2️. Allowed Budget For Current Slice (5 days)
//
// sliceAllowed = allowedBadEvents × timeWindowRatio
//              = 10 × (1/6)
//              = 1.67 failures
//
// Meaning:
// In this 5-day slice, we should only burn ~1.67 failures
// to stay within sustainable SLO consumption.
//
// -----------------------------------------------------
// 3️. Example A — Healthy System
//
// simulatedFailures = 0
//
// consumed = 0
//
// remaining = allowedBadEvents - consumed
//           = 10 - 0
//           = 10
//
// remainingRatio = remaining / allowedBadEvents
//                = 10 / 10
//                = 1.0  (100% budget left)
//
// burnRate = consumed / sliceAllowed
//          = 0 / 1.67
//          = 0
//
// Projection logic:
// 0 failures in 5 days × 6 = 0 failures in 30 days
//
// severity = "normal"
//
// -----------------------------------------------------
// 4️. Example B — Mild Degradation
//
// simulatedFailures = 2
//
// consumed = 2
//
// remaining = 10 - 2
//           = 8
//
// remainingRatio = 8 / 10
//                = 0.8  (80% budget left)
//
// burnRate = 2 / 1.67
//          = 1.2
//
// Projection logic:
// 2 failures in 5 days × 6 = 12 failures over 30 days
//
// But only 10 are allowed → projected violation.
//
// severity = "slow-burn"
//
// -----------------------------------------------------
// 5️. Example C — Severe Degradation
//
// simulatedFailures = 10
//
// consumed = 10
//
// remaining = 10 - 10
//           = 0
//
// remainingRatio = 0 / 10
//                = 0
//
// burnRate = 10 / 1.67
//          = 6
//
// Projection logic:
// 10 failures in 5 days × 6 = 60 failures over 30 days
//
// That is 6× the allowed budget.
//
// severity = "exhausted"
//
// -----------------------------------------------------
// 6️. Interpretation of burnRate
//
// burnRate > 1:
//   We are consuming budget faster than sustainable.
//
// burnRate = 1:
//   Exactly sustainable rate.
//
// burnRate < 1:
//   Budget consumption is healthy.
//
// remainingRatio <= 0:
//   Full error budget exhausted.
//
// =====================================================
