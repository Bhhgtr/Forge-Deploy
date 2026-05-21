import fs from "fs";
import path from "path";

const BASE = path.join(process.cwd(), "control-plane", "audit");

export function appendAudit(
  domain: string,
  event: Record<string, unknown>,
): void {
  fs.mkdirSync(BASE, { recursive: true });

  const filePath = path.join(BASE, `${domain}.log`);

  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  fs.appendFileSync(filePath, JSON.stringify(entry) + "\n");
}
