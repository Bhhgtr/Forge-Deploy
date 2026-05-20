import fs from "fs";
import path from "path";
import type { Incident } from "./incident.js";

const INCIDENTS_BASE = path.join(process.cwd(), "incidents");
const POLICY_BASE = path.join(INCIDENTS_BASE, "policy-incidents");

function getBaseFolder(incident: Incident): string {
  if (incident.severity === "policy-violation") {
    return POLICY_BASE;
  }

  return INCIDENTS_BASE;
}

export function saveIncident(incident: Incident): void {
  const base = getBaseFolder(incident);

  fs.mkdirSync(base, { recursive: true });

  fs.writeFileSync(
    path.join(base, `${incident.id}.json`),
    JSON.stringify(incident, null, 2),
  );
}

export function loadIncidents(): Incident[] {
  const loadFrom = (dir: string): Incident[] => {
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) =>
        JSON.parse(
          fs.readFileSync(path.join(dir, file), "utf-8"),
        ) as Incident,
      );
  };

  return [
    ...loadFrom(INCIDENTS_BASE),
    ...loadFrom(POLICY_BASE),
  ];
}