---
name: newsession
description: Prime a fresh session for a surgical change. Reads the named modules end-to-end across every layer (schema → domain → data → application → outbox → api → module dir → pages) before forming a plan or touching code. Treats the code as the source of truth — does not rely on memory or assumptions about current behavior. Use only on explicit `/newsession`.
---

# /newsession

The user's prompt after `/newsession` always defines the session's purpose and names the modules involved. Your job: before you reason about the change, do a complete end-to-end read of every named module. Then produce a checklisted, layer-grouped plan that references real files.

## Hard rules

- **Read first, plan second.** Do not propose a design, file edits, or a step list until you have read the relevant code across every layer below for each named module. The code is the source of truth — ignore stale assumptions, prior-session habits, and memory snapshots that contradict what is in the files right now.
- **Surgical, not speculative.** The plan must cite real files, real functions, real layers. No "we could maybe add a helper here" unless you've confirmed the helper doesn't already exist.
- **Don't edit during analysis.** This skill is a read + plan phase. Apply changes only after the plan is laid out and the user has greenlit it (or the prompt clearly directs an immediate execution).
- **Stay within the user's stated scope.** Do not propose refactors, abstractions, or rewrites of code the user didn't ask about. Note adjacent issues in the plan's "Open questions" — don't fold them into the work.
- **Explicit-only.** Trigger only on literal `/newsession`. Never on phrases like "new session", "start over", "fresh take".

## Step 1 — List the modules in scope

The user's prompt names the modules (e.g. "template sync, properties, management companies"). List them at the top of your response as a checklist so it's obvious what's about to be read. The user explicitly defines the purpose in the prompt — do not ask clarifying questions about scope before reading.

## Step 2 — End-to-end read per module

For each in-scope module, read the files at each layer that exists for it. Not every module has every layer — note absences explicitly rather than inventing files.

Layers (canonical order from CLAUDE.md):

- **Schema** — `packages/db/prisma/schema.prisma` (relevant models + relations) and recent migrations under `packages/db/prisma/migrations/` that touch them
- **Domain** — predicates, message builders, types, zod payload schemas, business logic
- **Data** — read repository, write repository, helpers, normalizers
- **Application** — each use case file; transaction boundaries, locking decisions, outbox event emission
- **Outbox / relay / worker** — only if the module participates
- **API** — the route(s) plus the rate-limit / auth / idempotency / telemetry gauntlet they apply
- **Module directory** — `modules/<name>/` controllers and components, plus what they pull from `modules/shared`
- **Pages** — `apps/web/app/dashboard/...` pages that load the module's UI

Use `Agent` with `subagent_type=Explore` for broad searches across many files; otherwise read targeted files directly with `Read`. Either way: actually open the files. Do not infer from filenames.

If the user's prompt explicitly names a file outside these layers (a specific shared component, a worker script, etc.), include it. Do not add other ad-hoc layers on your own.

## Step 3 — Find the seams between modules

After the per-module read, identify the actual code paths that connect the modules the user mentioned. This is usually where the change lives.

Concretely: for each interaction the user describes ("clicking a row in A opens panel B with state X preselected"), find the current handler, find the panel's entry point, and find what state/props each side already has access to. Note what's missing.

## Step 4 — Produce the plan

Output must be checklisted and grouped by layer, scannable, with real `path:line` citations where useful. Use this shape:

```
NEW SESSION PLAN — <one-line summary of the change>

═══ Modules in scope ═══
- [ ] <module>: <one-line current-state summary>
- [ ] <module>: <one-line current-state summary>

═══ Current behavior (what the code does today) ═══
- <seam 1>: <factual description, citing files>
- <seam 2>: <factual description, citing files>

═══ Target behavior (what the user asked for) ═══
- <restated in concrete code terms>

═══ Plan — grouped by layer ═══

Schema
- [ ] <file path> — <exact change>

Domain
- [ ] <file path> — <exact change>

Data
- [ ] <file path> — <exact change>

Application
- [ ] <file path> — <exact change>

Outbox / relay / worker
- [ ] <file path> — <exact change>   (omit section if N/A)

API
- [ ] <file path> — <exact change>

Module directory
- [ ] <file path> — <exact change>

Pages
- [ ] <file path> — <exact change>

═══ Open questions ═══
- [ ] <ambiguity in the user's prompt that needs an answer before edits>
- [ ] <adjacent issue noticed during the read but out of stated scope>
```

Omit any layer section that has no work in it (don't print empty headers).

If the plan is small and the user's prompt clearly directs execution, proceed to edits after printing the plan. Otherwise stop and wait for the user's go-ahead.

## What this skill does NOT do

- Skip the read because "I already know this codebase."
- Trust memory over the current state of a file.
- Propose abstractions or refactors outside the user's stated scope.
- Add ad-hoc layers (e.g. `web/components/*`) unless the user's prompt explicitly names a file there.
- Edit code during the analysis phase.
- Trigger on anything other than the literal `/newsession` invocation.
