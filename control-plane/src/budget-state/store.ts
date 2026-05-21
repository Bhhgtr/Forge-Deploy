import fs from "fs";
import path from "path";
import type { BudgetWindowState } from "./budgetWindowDefinition.js";

const BASE = path.join(process.cwd(), "control-plane", "state", "budget");

function getFilePath(service: string): string {
  return path.join(BASE, `${service}.json`);
}

export function loadBudgetWindow(service: string): BudgetWindowState | null {
  const file = getFilePath(service);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function saveBudgetWindow(state: BudgetWindowState): void {
  fs.mkdirSync(BASE, { recursive: true });

  const file = getFilePath(state.service);
  const tmp = `${file}.tmp`;

  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}
