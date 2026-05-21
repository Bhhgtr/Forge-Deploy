import fs from "fs";
import path from "path";
import type { ServiceHealthState } from "./serviceHealthState.js";

const BASE = path.join(process.cwd(), "control-plane", "state", "health");

function getFilePath(service: string): string {
  return path.join(BASE, `${service}.json`);
}

export function loadServiceHealthState(
  service: string,
): ServiceHealthState | null {
  const file = getFilePath(service);

  if (!fs.existsSync(file)) return null;

  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function saveServiceHealthState(state: ServiceHealthState): void {
  fs.mkdirSync(BASE, { recursive: true });

  const file = getFilePath(state.service);

  // atomic write (prevents partial corruption)
  const tempFile = `${file}.tmp`;

  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
  fs.renameSync(tempFile, file);
}
