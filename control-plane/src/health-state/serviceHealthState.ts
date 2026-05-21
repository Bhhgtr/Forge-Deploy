export interface ServiceHealthState {
  service: string;
  lastEvaluatedAt: string;
  lastExhaustedAt: string;
  freezeUntil?: string;
}
