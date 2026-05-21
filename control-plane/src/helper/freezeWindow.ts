import type { ServiceHealthState } from "../health-state/serviceHealthState.js";
import {
  loadServiceHealthState,
  saveServiceHealthState,
} from "../health-state/store.js";

export function updateFreezeWindow(
  service: string,
  freezeDurationMs: number,
): void {
  const now = Date.now();
  const existing = loadServiceHealthState(service);

  const proposedFreezeUntil = new Date(now + freezeDurationMs).toISOString();

  let freezeUntil = proposedFreezeUntil;

  if (existing?.freezeUntil) {
    const existingTime = new Date(existing.freezeUntil).getTime();
    const proposedTime = new Date(proposedFreezeUntil).getTime();

    if (existingTime > proposedTime) {
      freezeUntil = existing.freezeUntil;
    }
  }

  const updated: ServiceHealthState = {
    service,
    lastEvaluatedAt: new Date().toISOString(),

    lastExhaustedAt: existing?.lastExhaustedAt ?? new Date().toISOString(),

    freezeUntil,
  };

  saveServiceHealthState(updated);
}

export function unfreezeIfExpired(service: string): void {
  const state = loadServiceHealthState(service);
  if (!state?.freezeUntil) return;

  const now = Date.now();
  const freezeTime = new Date(state.freezeUntil).getTime();

  if (freezeTime <= now) {
    const updated: ServiceHealthState = {
      service: state.service,
      lastEvaluatedAt: new Date().toISOString(),
      lastExhaustedAt: state.lastExhaustedAt,
    };

    saveServiceHealthState(updated);
  }
}
