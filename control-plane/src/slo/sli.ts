export type SLIType = "latency" | "availability";

export interface SLI {
  name: string;
  description: string;
  promQuery: string;
  unit: string;
}

export const DEMO_APP_SLIS: SLI[] = [
  {
    name: "request_success_rate",
    description: "The percentage of successful HTTP requests",
    unit: "percentage",
    promQuery: `
			sum(rate(http_requests_total{status!~"5.."}[5m]))
			/
			sum(rate(http_requests_total[5m]))
		`,
  },
  {
    name: "request_latency_p95",
    description: "The 95th percentile of HTTP request latency",
    unit: "milliseconds",
    promQuery: `
			histogram_quantile(
				0.95,
				sum by (le) (
					rate(http_request_duration_seconds_bucket[5m])
				)
			)
		`,
  },
];
