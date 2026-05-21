import fs from "fs";
import path from "path";
import type { ActionProposal } from "./proposal.js";

const BASE = path.join(process.cwd(), "action-proposals");

export function saveProposal(proposal: ActionProposal): void {
  fs.mkdirSync(BASE, { recursive: true });

  fs.writeFileSync(
    path.join(BASE, `${proposal.id}.json`),
    JSON.stringify(proposal, null, 2),
  );
}

export function loadProposals(): ActionProposal[] {
  if (!fs.existsSync(BASE)) return [];

  return fs
    .readdirSync(BASE)
    .filter((file) => file.endsWith(".json"))
    .map(
      (file) =>
        JSON.parse(
          fs.readFileSync(path.join(BASE, file), "utf-8"),
        ) as ActionProposal,
    );
}

export function updateProposal(proposal: ActionProposal): void {
  fs.mkdirSync(BASE, { recursive: true });

  fs.writeFileSync(
    path.join(BASE, `${proposal.id}.json`),
    JSON.stringify(proposal, null, 2),
  );
}
