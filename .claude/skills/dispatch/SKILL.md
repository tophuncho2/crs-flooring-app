---
name: dispatch
description: Split a body of work across the dev-N branches without two branches ever touching the same file. The dispatch analog of /newsession — reads the named work end-to-end across every layer (schema → domain → data → application → outbox → api → module dir → pages), then emits one self-contained dispatch brief per branch under .claude/DISPATCH/, each anchored to a non-overlapping file-ownership map. Editing skill (writes briefs, never code). Explicit-only — invoke on /dispatch.
---

# /dispatch

`/dispatch <the work to split across branches>` makes you the dispatcher. The user describes a checklist of things that need to happen; you discuss, read the code end-to-end, partition the files so no two branches collide, and write **one standalone dispatch brief per branch** under `.claude/DISPATCH/`. A `dev-N` session later pastes its brief **cold** — knowing nothing about the other branches — and can execute from it alone.

This is the dispatch analog of `/newsession`: same end-to-end, code-is-source-of-truth read, but aimed at **parallelizing work across worktrees without merge conflicts**. The whole reason this skill exists is conflict avoidance — the **file-ownership map** is the core deliverable.

It is an **editing** skill, but it only ever writes brief markdown under `.claude/DISPATCH/`. It never touches application code, never runs migrations, never commits.

## The model (terms this skill uses)

- **Dispatch brief** — one markdown file under `.claude/DISPATCH/<slug>.md`, addressed to a single `dev-N` branch. Self-contained: a fresh Claude on that branch executes from it with zero outside context.
- **File-ownership map** — the partition of every file the work touches into disjoint per-branch sets. No path appears in two briefs. This is the artifact that guarantees no merge conflict.
- **Branch model** — `.bare` + per-branch worktrees; `dev-1, dev-2, … dev-N` are sub-branches off `dev`. The user runs all merges and migrations. You only write briefs; you do not assign branches to humans, merge, or sync (that's the user + `/dev-sync`).
- **Standalone rule** — a brief must not reference other branches, other briefs, or the umbrella epic. If two branches must coordinate on a shared file, that's a partition failure — fix the split, don't cross-reference.

## Hard rules

- **Read first, partition second, write third.** Do not draft any brief until you've read the work end-to-end across every relevant layer (the `/newsession` layers). The code is the source of truth — ignore stale memory and prior-session assumptions.
- **No file in two briefs — ever.** The file-ownership map must be a strict partition. If a needed file can't be cleanly owned by one branch, split the work differently (by layer, by sub-feature, by directory) until ownership is disjoint. Overlap is the one failure this skill exists to prevent.
- **Every brief is standalone.** No mention of other branches, other dispatch files, or the parent epic. A `dev-N` reader knows only its own brief. Self-test each brief: "could someone who has seen *only this file* execute it?"
- **Fan out to read, synthesize to write.** Use parallel `Explore` agents (one per concern/module/layer) to map the code, then synthesize their findings yourself into the partition. This fan-out-then-write flow is the method — don't read serially when the surface is wide.
- **Briefs plan; they don't pre-execute.** Each brief tells its branch to STOP and confirm the plan before editing, mirrors the layered playbook, and carries the project non-negotiables: **migration written, not run** (the user runs migrations), **`/check` green before done**, **≤17-word commit message**, **DO NOT COMMIT** (the user commits).
- **You write only `.claude/DISPATCH/` files.** No code edits, no migrations, no git mutations, no commits. Provide a ≤17-word commit message for the briefs; the user commits them.
- **Drive, don't multiple-choice.** Surface genuine open questions (an unavoidable shared file, an ambiguous branch count, a layer that can't be cleanly split) in your response — don't stop to offer menus you can resolve from the code.
- **Explicit-only.** Trigger on the literal `/dispatch`. Not on "dispatch this", "split the work", "hand these out".

## Step 1 — Take the checklist and name the branches

Restate the user's checklist as a flat list of work items. Determine how many branches the work splits across (the user usually says, or it falls out of the partition). Discover the live `dev-N` branches dynamically rather than assuming a count:

```
git for-each-ref --format='%(refname:short)' refs/heads/ | grep -E '^dev-[0-9]+$' | sort -V
```

List the work items and the candidate branches at the top of your response. Do not ask scope questions you can answer by reading the code.

## Step 2 — Fan out and read the work end-to-end

For each concern/module in the checklist, read every layer that exists for it (canonical order from `CLAUDE.md`):

- **Schema** — `packages/db/prisma/schema.prisma` models + relations; recent migrations under `packages/db/prisma/migrations/`
- **Domain** — predicates, message builders, types, zod payloads, business logic
- **Data** — read/write repositories, helpers, normalizers
- **Application** — each use case file; transaction boundaries, locking, outbox emission
- **Outbox / relay / worker** — only if the work participates
- **API** — the route(s) + the rate-limit / auth / idempotency / telemetry gauntlet
- **Module directory** — `modules/<name>/` controllers + components, plus what they pull from `modules/shared` and `apps/web/engines/`
- **Pages** — `apps/web/app/dashboard/...` pages

Spawn parallel `Explore` agents — one per concern or per layer-cluster — to locate every file the work touches and report real `path:line` cites. Then synthesize: build the complete list of touched files yourself. Do not infer from filenames; the briefs must cite code that exists.

## Step 3 — Build the file-ownership map (the partition)

From the synthesized file list, assign every touched file to exactly one branch. Prefer split lines that fall on natural seams so ownership stays disjoint:

- **By layer** — e.g. one branch owns schema+domain+data, another owns api+module+pages (works when the seam between them is a stable contract).
- **By module / feature** — each branch owns a whole vertical slice (all layers for module X).
- **By directory** — clean when modules don't share files.

For each candidate split, check shared files (a barrel, a shared component, `schema.prisma`, a shared zod file). If a file must be edited by more than one branch, the split is wrong — re-partition until the map is a strict partition. If a shared file is **genuinely** unavoidable (e.g. a single migration, one barrel export), give it to exactly one branch and make the other branches' briefs not need it; call this out in your response as an open question.

Render the map as a table before writing briefs, so the no-overlap property is visible at a glance.

## Step 4 — Write one standalone brief per branch

For each branch, write `.claude/DISPATCH/<slug>.md`. Mirror the existing dispatch files in `.claude/DISPATCH/` for format and voice if any are present. Each brief uses this skeleton:

```
# <slug> — <one-line mission for THIS branch only>

## STOP — plan before you touch anything
You are on a fresh dev-N branch. Read the files below across every layer,
confirm the plan, THEN edit. The code is the source of truth.

## Scope
In:  <exactly what this branch changes>
Out: <what this branch must NOT touch — phrased without naming other branches>

## Files you own (do not edit anything outside this list)
- <path> — <why>
- <path> — <why>

## Layer-by-layer map
Schema      — <path:line> — <change>   (omit layers with no work)
Domain      — <path:line> — <change>
Data        — <path:line> — <change>
Application — <path:line> — <change>
API         — <path:line> — <change>
Module dir  — <path:line> — <change>
Pages       — <path:line> — <change>

## Migration (if schema changes)
Write the migration; DO NOT run it. The user runs all migrations.

## Done means
- /check green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
```

Every brief stands alone: no "see also", no other branch names, no epic name. Strip any cross-reference before saving.

## Step 5 — Report (per project CLAUDE.md)

Headline + the briefs written + the ownership map + open questions. End with a ≤17-word commit message. Do not commit.

```
DISPATCH — <work summary> — <N> branches

═══ Branches ═══
<dev-1, dev-2, … from Step 1>

═══ File-ownership map (strict partition — no path twice) ═══
Branch   | Owns (files / layers)              | Brief
---------+------------------------------------+----------------------------------
dev-1    | <files / layer slice>              | .claude/DISPATCH/<slug>.md
dev-2    | <files / layer slice>              | .claude/DISPATCH/<slug>.md

═══ Overlap check ═══
✅ / ❌  no file appears in two briefs
<if ❌: the shared file + how it's resolved>

═══ Briefs written ═══
- .claude/DISPATCH/<slug>.md — <branch> — <one-line mission>

═══ Open questions ═══
- <unavoidable shared file / ambiguous branch count / un-splittable layer, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Edit application code, run migrations, sync, merge, or commit — it only writes `.claude/DISPATCH/` briefs (the user does the rest; `/dev-sync` syncs, the user merges).
- Produce a brief that references another branch, another brief, or the parent epic — every brief is standalone by rule.
- Emit a file-ownership map where any path appears in two briefs — that's the one failure mode it prevents.
- Plan a single-branch surgical change — that's `/newsession`.
- Report branch ahead/behind state or open a dispatching session — that's `/dispatch-begin`.
- Infer touched files from names without reading them, or cite paths it didn't open.
- Trigger on anything but the literal `/dispatch` invocation.
