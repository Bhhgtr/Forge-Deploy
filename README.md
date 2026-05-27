# 🔩 Forge-Deploy — SLO-Driven Reliability Control Plane

> A reliability-first control plane that governs deployments through SLOs, error budgets, and human-approved GitOps actions.

Forge-Deploy is **not** a CI/CD pipeline or deployment tool.

It is the layer that sits before deployment and asks: **is it actually safe to ship right now?**

---

## The Problem

Engineering velocity is increasing. Reliability understanding is not keeping pace.

The result is predictable:

- Changes ship without a clear picture of system health
- Monitoring is built around infrastructure — not what users actually experience
- Incidents are handled reactively, with no consistent process
- The same failure patterns repeat across teams
- Automation exists, but operates without policy guardrails

Forge-Deploy treats reliability as a first-class engineering concern, not something bolted on after the fact.

---

## What It Does

At its core, Forge-Deploy is a **control plane** — a decision-making layer that:

- Defines service health targets using **SLOs**
- Reads live telemetry from **Prometheus** (read-only, always)
- Computes **error budgets** and **burn rates** continuously
- Manages **incidents as structured, stateful workflows**
- Produces **governed action proposals** for human review
- Enforces deployment policy automatically
- Commits all changes **through Git only** — never directly to production

---

## Architecture

Forge-Deploy is split into three clearly bounded layers:

```
┌─────────────────────────────────┐
│        Control Plane            │  ← Forge-Deploy Core
│  SLO eval · incident mgmt       │
│  policy engine · proposals      │
└────────────┬────────────────────┘
             │ Git PR / commit
┌────────────▼────────────────────┐
│        Execution Plane          │  ← Kubernetes + GitOps
│  ArgoCD · Argo Rollouts         │
└─────────────────────────────────┘
             ▲
┌────────────┴────────────────────┐
│      Observability Layer        │  ← Prometheus (read-only)
└─────────────────────────────────┘
```

The control plane **never calls the Kubernetes API directly** and never kubectl-executes anything. Git is the sole path from decision to change.

---

## How It Works

Forge-Deploy runs a continuous evaluation loop:

1. Pull current metrics from Prometheus
2. Derive SLI values, then compute SLO compliance
3. Calculate remaining error budget and burn rate
4. Classify burn rate severity — `normal` / `slow-burn` / `fast-burn` / `exhausted`
5. On unhealthy signal: open or update an incident, generate a proposal, apply freeze if needed
6. Check whether the service is eligible for promotion
7. Write structured audit evidence

---

## Incident Management

Rather than firing alerts, Forge-Deploy tracks incidents as **explicit state machines**:

```
detected → investigating → mitigated → resolved → postmortem-complete
```

Each transition is timestamped and persisted. There is always at most one active incident per service, and the full history is replayable.

---

## Action Proposals

When Forge-Deploy determines action is needed, it raises a **proposal** — never takes action itself.

| Type               | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `rollback-rollout` | Revert to the last known-good version               |
| `promote-canary`   | Advance a canary that has met its health gates      |
| `block-promotion`  | Halt further rollout due to budget or policy breach |

Proposals are inert until explicitly approved. Each incident generates at most one proposal of each type (idempotent).

---

## Approval & Execution Flow

Once a human approves a proposal:

1. Proposal status set to `approved`
2. Change commit prepared against the environment repo
3. Feature branch created
4. Pull request opened automatically
5. ArgoCD detects and reconciles the diff
6. Incident advances to `mitigated`

No manual `kubectl` commands. No direct cluster access. Git handles everything.

---

## Policy Engine

Forge-Deploy evaluates policy at two levels:

**Structural** — before a service can participate, it must declare:

- An owner
- At least one SLO
- A rollback strategy
- A canary-based deployment strategy

**Runtime** — promotion is automatically blocked when:

- The error budget is exhausted
- Burn rate exceeds the configured safety threshold
- The remaining budget is below the minimum safety margin
- A freeze window is currently active

Policy violations raise dedicated policy incidents and block-promotion proposals.

---

## Freeze Windows

Budget exhaustion triggers an automatic freeze:

- All promotions halt
- The service must demonstrate stability before changes resume

This prevents the failure pattern of repeatedly deploying into a degraded system.

---

## Audit Trail

Every decision Forge-Deploy makes is written to a structured evidence directory:

```
evidence/
  incident-XXXX/
    decision.json
    slo.json
    budget.json
    proposal.json
    approval.json
    resolution.json
```

Audit logs are append-only and domain-separated across `metrics`, `budget`, `incidents`, and `governance` streams. Every outcome is explainable and replayable.

---

## Persistence

State lives on disk as plain JSON and log files:

```
incidents/*.json
action-proposals/*.json
control-plane/state/*
control-plane/audit/*.log
```

No database dependency. Simple to inspect, simple to debug, deterministic to replay.

---

## Tech Stack

| Layer             | Tools                                     |
| ----------------- | ----------------------------------------- |
| Control Plane     | TypeScript · Node.js · Zod · Vitest       |
| Observability     | Prometheus                                |
| Execution         | Kubernetes · ArgoCD · Argo Rollouts       |
| Developer Tooling | pnpm · Docker · ESLint · Prettier · Husky |

Patterns: GitOps · Progressive Delivery (Canary) · SLO/Error Budget governance · Event-driven incident lifecycle

---

## Engineering Standards

- Strict TypeScript with `noUncheckedIndexedAccess`
- Zod validation on all external inputs (env vars, Prometheus API responses)
- ~98% test coverage with Vitest
- ESLint with security plugin
- Husky + lint-staged enforcing quality on every commit
- pnpm lockfile for fully deterministic installs

---

## Getting Started

**Prerequisites:** Node.js 18+, pnpm, a Prometheus endpoint

```bash
# Clone and install
git clone https://github.com/Buthsaraa/Forge-Deploy.git
cd Forge-Deploy
pnpm install

# Configure
cp .env.example .env
# Set PROMETHEUS_URL and service identifiers in .env

# Run
pnpm run dev   # starts the evaluation loop
pnpm test                # runs the full test suite
```

---

## Current Scope

This is a single-service prototype (`demo-app`) with file-based persistence and a CLI-based approval workflow.

That's a deliberate trade-off — keeping the implementation simple makes the architecture easier to reason about, audit, and extend.

---

## Design Principles

| Principle                            | What it means in practice                         |
| ------------------------------------ | ------------------------------------------------- |
| Git is the only actuator             | No direct cluster mutations, ever                 |
| Observable before automated          | Decisions come from real metrics, not assumptions |
| Humans stay in the loop              | Every consequential action requires approval      |
| Incidents are learning opportunities | Evidence is always captured and retained          |

---

## Summary

Forge-Deploy is a reliability governance system.

It doesn't deploy software. It decides whether software _should_ be deployed — and enforces that decision through policy, evidence, and human oversight.

> _Shipping fast is only valuable if the system stays healthy. Forge-Deploy makes sure you know which one you're trading off._

--

## Related Repositories

Forge-Deploy is one part of a three-repo system. Each repo has a distinct role:

| Repo | Role |
|---|---|
| **Forge-Deploy** | This repo — control plane, SLO evaluation, incident management, proposals |
| [Forge-Deploy-Environment](https://github.com/Buthsaraa/Forge-Deploy-Environment) | GitOps manifests — Argo CD Application, Argo Rollouts canary strategy |
| [Forge-Deploy-Demo-App](https://github.com/Buthsaraa/Forge-Deploy-Demo-App) | Target workload — Express service exposing health, metrics, and failure endpoints |

The typical flow across repos:

```
Forge-Deploy-Demo-App  →  GHCR (image)  →  Forge-Deploy-Environment (manifests)
                                                        ↑
                                          Forge-Deploy (proposes changes via PR)
```

---

---

## License

ISC
