import fs from "fs";
import path from "path";
import { z } from "zod";
import type { ServiceDefinition } from "./serviceDefiniton.js";

const CATALOG_DIR = path.resolve(process.cwd(), "catalog");

const ServiceSchema = z.object({
  name: z.string(),
  owner: z.string().min(1),
  slos: z
    .array(
      z.object({
        name: z.string(),
        target: z.number(),
      }),
    )
    .min(1),
  deploymentStrategy: z.enum(["canary", "blue-green"]),
  rollbackStrategy: z.enum(["git-revert", "image-rollback"]),
  runbookUrl: z.url(),
  costBudget: z.number().optional(),
});

export function loadCatalog(): ServiceDefinition[] {
  if (!fs.existsSync(CATALOG_DIR)) {
    throw new Error("Catalog directory not found.");
  }

  const files = fs.readdirSync(CATALOG_DIR);

  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const fullPath = path.join(CATALOG_DIR, file);
      const raw = fs.readFileSync(fullPath, "utf-8");
      const parsed = JSON.parse(raw);

      const validated = ServiceSchema.parse(parsed);

      return validated as ServiceDefinition;
    });
}

export function loadService(name: string): ServiceDefinition {
  const services = loadCatalog();

  const service = services.find((s) => s.name === name);

  if (!service) {
    throw new Error(`Service '${name}' not found in catalog.`);
  }

  return service;
}
