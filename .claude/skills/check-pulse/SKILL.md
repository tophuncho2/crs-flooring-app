---
name: check-pulse
description: Run the daily read-only production health board — `npm run pulse` (`bin/pulse.sh`) — then interpret the §1-6 output and report a structured 🟢/🟡/🔴 table with a TL;DR and a drill-into-red follow-up. Covers local/git, CI & backups (gh), Railway services, outbox health, stuck staged rows, and Redis/BullMQ, all against prod (main env). Read-only recon — it runs status/logs/list/SELECT only and never deploys, migrates, writes, or commits. Explicit-only — invoke on /check-pulse.
---

# /check-pulse

Run the morning pulse — the daily "is prod running smoothly?" board — and interpret it in one pass. `bin/pulse.sh` is the deterministic gatherer (strictly read-only: status / logs / list / SELECT, on an explicit allowlist); this skill runs it and turns the §1-6 output into a clean roll-up, drilling into anything red or yellow.

Invoke as `/check-pulse`. It watches **prod (main env) only**, by the user's design.

## The model (what the pulse reads)

Six sections, each rolling up to 🟢/🟡/🔴, then a TL;DR line (the script `exit 1` if any red):

- **§1 Local / git** — this worktree's branch + dirty count; main worktree clean + ahead/behind `origin/main` (best-effort fetch).
- **§2 CI & Backups (gh)** — DB backup freshness (🔴 >26h/fail, 🟡 >24h), CI on main, prune-db-tables cron, restore drills.
- **§3 Railway (main env)** — per-service `latestDeployment.status`==SUCCESS for `crs-flooring-{app,relay,worker,db}` + Redis, plus a recent-log error-grep (heuristic → 🟡).
- **§4 Outbox** (`queue_outbox_event`) — EXHAUSTED>0 🔴, PROCESSING locked >5m 🔴, due PENDING >15m 🟡.
- **§5 Stuck staged rows** (`flooring_import_staged_inventory_row`) — QUEUED-not-IMPORTED >60m 🔴, >30m 🟡 (the known [[staged-import-rows-loosening-pending]] recovery gap).
- **§6 Redis** — PING + BullMQ depth on `bull:flooring-imports-materialize` (failed>0 🔴, waiting>100 🟡, active>1 🟡) + mem/clients.

Creds are prod-only, read live from the **main worktree's `.env`** (single source of truth — no per-branch copies): `RAILWAY_TOKEN` (§3), `DATABASE_URL` (§4/§5), `REDIS_URL` (§6). See [[morning-pulse-check]].

## Hard rules

- **Read-only, always.** This skill runs `npm run pulse` and reports. It never deploys, migrates, writes, or edits code. A red or yellow line is a finding to *surface*, not to auto-remediate — propose the fix, don't apply it.
- **Run the whole board even if a section degrades.** `pulse.sh` is `set -uo pipefail` (not `-e`) precisely so one failing check never aborts the rest. Report every section, including the ones that skipped (missing CLI / no cred).
- **Report per CLAUDE.md:** a 🟢/🟡/🔴 section table plus a one-line TL;DR. Put any red/yellow root cause and any open question in the response.
- **Distinguish a real red from a skipped check.** "psql not installed", "no RAILWAY_TOKEN", "gh not authenticated" are ⚠️ *skipped* (tooling/cred gaps on this machine), not 🔴 *prod is down*. Never report a skip as an outage.
- **Do not "fix" prod from here.** Stranded staged rows, EXHAUSTED outbox events, failed BullMQ jobs → name them and point at the owning runbook/skill; the recovery action is a separate, deliberate step.
- **Never commit**, never run a migration, and this skill has no code to change — so there is nothing to build or typecheck. If the user then asks to act on a finding, that's a new task.
- **Explicit-only.** Trigger on the literal `/check-pulse`.

## Step 1 — Run the pulse

From any worktree, run the wired npm script and capture the full board (it self-terminates — logs use `--lines`, DB/Redis reads are bounded by `timeout 25`):

```
npm run pulse 2>&1
```

- The script resolves the main worktree via `git worktree list --porcelain` to find `main/.env`. If it prints `env-file: <none found>`, §3-6 will skip on missing creds — report that as a machine-setup ⚠️, not an outage.
- To point at a different env file: `PULSE_ENV=/path/to/.env npm run pulse`.
- Give it a generous timeout (`timeout: 120000`) — §2 hits GitHub, §3 hits Railway, §4-6 hit the prod DB/Redis over the public proxy.

## Step 2 — Interpret the output

Read the captured board section by section. For each §1-6, record its worst line's glyph (🔴 > 🟡 > 🟢) and the one-line reason. Then classify each non-green line:

- **🔴 real** — an actual prod-health signal (backup stale/failed, a Railway service `deployment stopped`, EXHAUSTED outbox events, stuck PROCESSING, stranded QUEUED rows, BullMQ failed jobs, Redis no-PONG).
- **🟡 watch** — aging-but-not-stranded (backup 24-26h, PENDING backlog, aging QUEUED, waiting-queue depth, error-ish log lines — the log grep is a heuristic).
- **⚠️ skipped** — a CLI or cred is missing on this machine (`psql/redis-cli/railway/gh not installed`, `no RAILWAY_TOKEN/DATABASE_URL/REDIS_URL`, `not authenticated`). Call these out separately so they never masquerade as outages.

Cross-reference the script's own TL;DR line (`N red · N warn · N ok`) as the ground truth for the roll-up.

## Step 3 — Report

Output a section table plus the TL;DR:

```
═══ Morning pulse · prod (main) · <date from banner> ═══

| §  | Section              | Status | Note                                            |
|----|----------------------|--------|-------------------------------------------------|
| 1  | Local / git          | 🟢/🟡  | main vs origin, dirty counts                    |
| 2  | CI & Backups         | 🟢/🟡/🔴 | backup age, CI on main                          |
| 3  | Railway (main)       | 🟢/🟡/🔴 | per-service deploy status + log grep            |
| 4  | Outbox               | 🟢/🟡/🔴 | EXHAUSTED / stuck PROCESSING / PENDING backlog  |
| 5  | Stuck staged rows    | 🟢/🟡/🔴 | stranded / aging QUEUED                          |
| 6  | Redis / BullMQ       | 🟢/🟡/🔴 | reachability + queue depth                       |

⚠️ Skipped (machine setup, not outages): <list, or "none">

TL;DR — <script's own roll-up line, in your words>

Drill-into-red:
- <each 🔴 with its likely cause + the owning runbook/skill; or "no red — prod looks healthy">
```

- If everything is green: one line — "🟢 all clear — prod looks healthy" — and skip the drill-into-red block.
- Surface any genuine open question (e.g. "backup 27h stale AND CI red on main — investigate deploy?") in your response text, not as a menu.

## What this skill does NOT do

- **Fix, deploy, migrate, or write anything** — it runs the read-only board and reports; remediation is a separate deliberate task.
- **Run the build gauntlet** — that's `/check-gauntlet` (build/typecheck/lint/test). This skill has no source to verify.
- **Watch lower envs** — the pulse is prod (main) only, by design; it does not check staging or dev-N.
- **Report scale/row-count metrics** — this pulse is HEALTH-only (stuck / dead-lettered / backed-up). Volume/scale reads are a SEPARATE future pulse per [[morning-pulse-check]].
- **Edit `bin/pulse.sh` or its thresholds** — tuning the gatherer or adding a §7 (e.g. Sentry) is a code change, not this skill's job.
- **Recover stranded staged rows or dead-lettered outbox events** — it flags them and points at the owning runbook; it does not run the recovery.
- **Commit** the pulse output or anything else — the user commits.
- **Trigger on anything but the literal `/check-pulse`** — not "run the pulse", not "check prod health".
