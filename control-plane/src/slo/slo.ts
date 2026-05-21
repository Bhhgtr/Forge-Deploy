import type { SLI } from "./sli.js";

export interface SLO {
  name: string;
  sli: SLI;
  target: number; // e.g., 99.9 for 99.9%
  windowDays: number; // e.g., 30 for a 30-day rolling window
  rationale: string; // Explanation of why this SLO was chosen, its importance, and any relevant context
}

export const DEMO_APP_SLOS: SLO[] = [
  {
    name: "availability-99.9",
    sli: {
      name: "request_success_rate",
      description: "",
      promQuery: "",
      unit: "",
    },
    target: 0.999, // 99.9% availability
    windowDays: 30,
    rationale:
      "Below 99.9% success rate, users experience frequent errors and trust degrades. This SLO ensures we maintain a high level of reliability and user satisfaction.",
  },
  {
    name: "latency-p95-300ms",
    sli: {
      name: "request_latency_p95",
      description: "",
      promQuery: "",
      unit: "",
    },
    target: 300, // 300ms latency
    windowDays: 30,
    rationale:
      "Latency above 300ms is perceived as slowness for synchronous APIs.",
  },
];
