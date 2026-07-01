---
name: quick-task
description: Lightweight mid-execution cleanup. Takes your invoke-time context plus session context (current diff, named/opened files, recent turns), scopes itself to ONE side — backend (packages/domain, packages/db/src data layer, packages/application) or frontend (apps/web) — reads just enough, makes a tight cleanup edit, and verifies the touched side only. Editing skill, minimal blast radius. Explicit-only — invoke on /quick-task.
---

# /quick-task

`/quick-task <what to clean>` is the "while we're here, tidy this" reflex during ongoing work. Mid-execution you spot a couple of quick cleanups — a dead import, a stale comment, a dup, a rename — and want them done tight without derailing the main task. `/quick-task` takes the context you give it plus the session's own context, scopes to **one side**, and makes a minimal-diff edit.

This is an **editing** skill. It is not a module sweep (that's `/session-new`), not an audit (that's `/dig`), not the build gauntlet (that's `/check`), and not a cross-layer refactor (that's `/engine` or a real session).

## The two sides

A `/quick-task` pass targets **one side**. Spanning both is the exception, not the default.

- **Backend** = `packages/domain`, the **data layer** at `packages/db/src/` (read/write repositories, helpers, normalizers), and `packages/application`.
- **Frontend** = `apps/web` (modules, `app/dashboard` pages, `components/`, `engines/`, `controllers/`).
- **Anywhere else** (api routes, outbox/relay/worker) = identified from the invoke context, not assumed.
- **Schema is off-limits.** `packages/db/prisma/` (schema + migrations) is never touched here — the user runs migrations. Note: `packages/db/src/` (data layer) is fair game; `packages/db/prisma/` is not.

## Hard rules

- **One side per pass.** Auto-detect the side from your invoke context + the session diff; state which side and why before editing. You can force it (`/quick-task backend …`). If the cleanup genuinely spans both, say so and do the side clearly in scope; **flag** the other rather than silently crossing over.
- **Tight diff.** Cleanup only — dead code, stale import/comment, rename, dup, lint-shaped nit. No behavior change, no new feature, no refactor that ripples across layers.
- **Respect layer import direction** for the side touched (per root `CLAUDE.md` and `packages/*/CLAUDE.md`). A cleanup must never introduce a cross-layer violation.
- **Never touch schema.** No edits under `packages/db/prisma/`, no migrations. If a cleanup needs a schema change, stop and flag it — out of `/quick-task` scope.
- **Read just enough.** Only the files in the cleanup + their immediate refs. No end-to-end layer read.
- **Verify the touched side only** — a scoped typecheck or the relevant test, not the full `/check` gauntlet unless the user asks.
- **DO NOT COMMIT.** Provide a ≤17-word commit message; the user commits.
- **Explicit-only.** Trigger on the literal `/quick-task`. Never on "quick fix", "quickly clean this up", "a quick edit".

## Step 1 — Read the context

Combine two inputs:

1. **Your invoke context** — the prompt after `/quick-task` (what to clean, and possibly which side).
2. **Session context** — `git status --short` and the current diff; files named this session; IDE-opened files surfaced via system reminders; recent turns where the nit was flagged ("we'll tidy that later", "that import's unused now").

## Step 2 — Pick the side + scope

Classify each cleanup item as **backend / frontend / elsewhere** using the boundary above. Confirm every item lands on **one** side. If they don't, narrow to the in-scope side and flag the rest. List the exact files in scope before editing.

## Step 3 — Make the edits

Make a minimal, scoped diff. Honor import direction. No schema. If an item turns out to be bigger than a cleanup (touches behavior, ripples across layers, needs a test rewrite), **stop and surface it** instead of expanding scope.

## Step 4 — Verify the touched side

Run a scoped typecheck / the relevant test for that side only. Report the real result — don't claim green from reading.

## Step 5 — Report

```
QUICK — <backend | frontend> — <one-line scope>

═══ Cleaned ═══
- <file:line> — <what changed, one line>

═══ Flagged (out of scope) ═══
- <other-side / schema / too-big item, or "none">

═══ Verify ═══
<scoped typecheck/test>: <PASS | N errors>

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Touch both sides in one pass by default (one side; flag the other).
- Change behavior, add features, or do a cross-layer refactor (that's `/engine` or a real session).
- Edit schema or run migrations (`packages/db/prisma/` is off-limits).
- Do a full module read (`/session-new`) or a loose-end audit (`/dig`).
- Run the full `/check` gauntlet unless asked.
- Commit.
- Trigger on anything but the literal `/quick-task` invocation.
