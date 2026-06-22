---
name: dispatch
description: Split a body of work across the dev-N branches without two branches ever touching the same file. The dispatch analog of /newsession — partitions the work into a non-overlapping file-ownership map, then runs ONE research+writer agent pair per branch (a deep newsession-level researcher feeds a paired writer that authors the brief) so the briefs are produced in parallel, not written serially in the main thread. Each brief tells its receiving dev-N session to run its own research skill and validate against the brief before acting. Editing skill (writes briefs, never code). Explicit-only — invoke on /dispatch.
---

# /dispatch

`/dispatch <the work to split across branches>` makes you the dispatcher. The user gives you a checklist of things that need to happen — sometimes talked through with you first, sometimes dropped in finished in one prompt. You partition the files so no two branches collide, then **fan out one research+writer agent pair per branch** to produce one self-contained dispatch brief per branch under `.claude/DISPATCH/`. A `dev-N` session later pastes its brief **cold** — knowing nothing about the other branches — and executes from it.

This is the dispatch analog of `/newsession`: same end-to-end, code-is-source-of-truth read, aimed at **parallelizing work across worktrees without merge conflicts**. Two things make this skill what it is:
1. **The file-ownership map** — conflict avoidance is the whole point; no path appears in two briefs.
2. **The agent-pair pipeline** — you do NOT research everything and write all the briefs yourself in one serial pass. You partition, then dispatch a deep **researcher** + a paired **writer** per branch so the briefs are built in parallel by focused agents.

It is an **editing** skill, but the only files written are brief markdown under `.claude/DISPATCH/` (written by the per-branch writer agents). It never touches application code, never runs migrations, never commits.

## The model (terms this skill uses)

- **Dispatch brief** — one markdown file under `.claude/DISPATCH/<slug>.md`, addressed to a single `dev-N` branch. Self-contained: a fresh Claude on that branch executes from it with zero outside context.
- **File-ownership map** — the partition of every file the work touches into disjoint per-branch sets. No path appears in two briefs. This is the artifact that guarantees no merge conflict, and it is the **dispatcher's** job — not delegated.
- **Research agent** — a deep, read-only `Explore` subagent scoped to ONE branch's ownership envelope. Does `/newsession`-level research across every layer for that slice and reports structured findings with real `path:line` cites. One per branch.
- **Writer agent** — a `general-purpose` subagent paired to one research agent. Consumes that branch's research findings + its ownership envelope + the chosen receiving-skill, and writes that branch's `.claude/DISPATCH/<slug>.md`. One per branch. This is why the main thread doesn't hand-write all the briefs.
- **Receiving session** — the fresh Claude Code on the dev-N worktree that the brief is dropped into. It runs its own research skill and validates against the brief before acting (see "the receiving-session contract").
- **Named skill** — the skill the brief tells the receiving session to run for its own research (e.g. `/newsession`, `/engine`). The user may name it; if not, you recommend or decide. The roster grows over time — today the top-tier skills are `/engine` and `/newsession`.
- **Branch model** — `.bare` + per-branch worktrees; `dev-1, dev-2, … dev-N` are sub-branches off `dev`. The user runs all merges and migrations. You only produce briefs; you do not assign branches to humans, merge, or sync (that's the user + `/dev-sync`).
- **Standalone rule** — a brief must not reference other branches, other briefs, or the umbrella epic. If two branches must coordinate on a shared file, that's a partition failure — fix the split, don't cross-reference.

## Hard rules

- **Partition first, then fan out, then collect.** Establish the disjoint file-ownership map yourself before any writer runs. The partition is the dispatcher's core deliverable and must not be delegated to the per-branch agents (they would not see each other and could collide).
- **No file in two briefs — ever.** The map must be a strict partition. If a needed file can't be cleanly owned by one branch, split the work differently (by layer, by sub-feature, by directory) until ownership is disjoint. Overlap is the one failure this skill exists to prevent — and if you sense it while the checklist is still being built, say so immediately.
- **One research+writer pair per branch — don't write the briefs yourself.** For each branch: spawn a deep researcher (read-only, scoped to that branch's envelope), then feed its findings to a paired writer that authors the brief. Researcher→writer is sequential per branch; the pairs run in parallel across branches. The main thread orchestrates and validates; it does not hand-author all three briefs in one serial pass.
- **The brief carries the receiving-session contract.** Every brief must (a) tell the receiving session which skill to run for its own research, (b) tell it to validate the brief against the live code before trusting it, and (c) honor mode: **plan mode → produce a plan and stop; auto mode → execute** — but research-and-validate FIRST either way. The brief is a high-confidence map, never a substitute for the receiving session reading the code.
- **Every brief is standalone.** No mention of other branches, other dispatch files, or the parent epic. A `dev-N` reader knows only its own brief. Self-test: "could someone who has seen *only this file* execute it?"
- **Briefs plan; they don't pre-execute.** Each brief carries the project non-negotiables: **migration written, not run** (the user runs migrations), **`/check` green before done**, **≤17-word commit message**, **DO NOT COMMIT** (the user commits).
- **You write only `.claude/DISPATCH/` files.** No code edits, no migrations, no git mutations, no commits. Provide a ≤17-word commit message for the briefs; the user commits them.
- **Drive, don't multiple-choice.** Surface genuine open questions (an unavoidable shared file, an ambiguous branch count, an un-splittable layer, an unspecified receiving-skill you can't confidently pick) in your response — don't stop to offer menus you can resolve from the code.
- **Explicit-only.** Trigger on the literal `/dispatch`. Not on "dispatch this", "split the work", "hand these out".

## Step 1 — Take the checklist and name the branches

The checklist may arrive finished in one prompt or be built up with you in conversation — handle both. Restate it as a flat list of work items. Determine how many branches the work splits across (the user usually says, or it falls out of the partition). Discover the live `dev-N` branches dynamically rather than assuming a count:

```
git for-each-ref --format='%(refname:short)' refs/heads/ | grep -E '^dev-[0-9]+$' | sort -V
```

List the work items and the candidate branches at the top of your response. Do not ask scope questions you can answer by reading the code.

## Step 2 — Partition first (build the file-ownership map yourself)

Before any per-branch agent runs, scan the surface enough to draw the disjoint ownership envelopes. This scan is broad, not deep — you need the **boundaries** (which modules / directories / files each branch owns), not the full implementation detail (the per-branch researchers get that). Use a quick parallel `Explore` pass if the surface is wide. Canonical layers (from `CLAUDE.md`) to keep in view when drawing seams:

- **Schema** — `packages/db/prisma/schema.prisma` models + relations; migrations under `packages/db/prisma/migrations/`
- **Domain** — predicates, message builders, types, zod payloads, business logic
- **Data** — read/write repositories, helpers, normalizers
- **Application** — use case files; transaction boundaries, locking, outbox emission
- **Outbox / relay / worker** — only if the work participates
- **API** — route(s) + the rate-limit / auth / idempotency / telemetry gauntlet
- **Module directory** — `modules/<name>/` controllers + components, plus what they pull from `modules/shared` and `apps/web/engines/`
- **Pages** — `apps/web/app/dashboard/...` pages

Assign every touched area to exactly one branch along natural seams (by module/feature vertical, by layer, or by directory). Watch the usual shared files — a barrel, a shared component, `schema.prisma`, a shared zod file. If a file would need editing by more than one branch, the split is wrong; re-partition until disjoint. If a shared file is **genuinely** unavoidable, give it to exactly one branch, make the others not need it, and flag it as an open question. Render the map as a table before fanning out, so the no-overlap property is visible at a glance.

## Step 3 — Decide the receiving-skill per branch

Each brief tells its receiving session which skill to run for its own research. Resolve this per branch before the writer runs:

- If the user named a skill for that branch (e.g. "have dev-2 rip `/engine`"), use it.
- Otherwise recommend or decide from the work's nature — today `/engine` for engine/UI-primitive work, `/newsession` for a surgical cross-layer change. The roster grows; pick the best current fit and say why.

## Step 4 — Fan out one research+writer pair per branch

For each branch, run a two-stage pipeline (pairs run in parallel across branches; stages are sequential within a branch):

1. **Researcher (`Explore`, read-only, deep).** Scope it to that branch's ownership envelope only. Instruct it to do `/newsession`-level research across every relevant layer for that slice and return structured findings with real `path:line` cites: the exact files, the precise change points, the reference patterns to copy, the gotchas, and anything that would surprise the receiving session.
2. **Writer (`general-purpose`, can Write).** Hand it: the researcher's findings, the branch's ownership envelope (files it owns + explicit out-of-bounds, phrased without naming other branches), and the chosen receiving-skill. It writes `.claude/DISPATCH/<slug>.md` using the skeleton below. It must produce a professional, structured, self-contained brief — everything the receiving session needs, and nothing that references another branch.

The writers do the authoring; you orchestrate and then validate. Do not collapse this into writing the briefs yourself.

### The brief skeleton (give this to each writer)

```
# <slug> — <one-line mission for THIS branch only>

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence
map, NOT a substitute for reading the code.
1. FIRST run `/<named-skill>` to do your own end-to-end research and VALIDATE this
   brief against the live code. Trust the code over this file if they disagree —
   and note the discrepancy.
2. Honor your mode:
   - PLAN mode  → produce a plan and STOP for approval.
   - AUTO mode  → execute the work.
   Either way, research-and-validate BEFORE acting.

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

Every brief stands alone: no "see also", no other branch names, no epic name. Each writer must strip any cross-reference before saving.

## Step 5 — Collect, validate overlap, report (per project CLAUDE.md)

When the writers finish, verify the union of owned files is still a strict partition (no path in two briefs), then report. End with a ≤17-word commit message. Do not commit.

```
DISPATCH — <work summary> — <N> branches

═══ Branches ═══
<dev-1, dev-2, … from Step 1>

═══ File-ownership map (strict partition — no path twice) ═══
Branch   | Owns (files / layers)     | Receiving skill | Brief
---------+---------------------------+-----------------+---------------------------
dev-1    | <files / layer slice>     | /<skill>        | .claude/DISPATCH/<slug>.md
dev-2    | <files / layer slice>     | /<skill>        | .claude/DISPATCH/<slug>.md

═══ Overlap check ═══
✅ / ❌  no file appears in two briefs
<if ❌: the shared file + how it's resolved>

═══ Briefs written ═══
- .claude/DISPATCH/<slug>.md — <branch> — <receiving skill> — <one-line mission>

═══ Open questions ═══
- <unavoidable shared file / ambiguous branch count / un-splittable layer / unset receiving-skill, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Edit application code, run migrations, sync, merge, or commit — it only writes `.claude/DISPATCH/` briefs (the user does the rest; `/dev-sync` syncs, the user merges).
- Hand-author all the briefs in one serial main-thread pass — each brief is produced by a per-branch research+writer pair.
- Delegate the file-ownership partition to the per-branch agents — the dispatcher owns it, because only it sees all branches at once.
- Produce a brief that references another branch, another brief, or the parent epic — every brief is standalone by rule.
- Emit a file-ownership map where any path appears in two briefs — that's the one failure mode it prevents.
- Ship a brief without the receiving-session contract (run-your-own-research skill + validate + plan-vs-auto by mode).
- Plan a single-branch surgical change — that's `/newsession`.
- Report branch ahead/behind state or open a dispatching session — that's `/dispatch-begin`.
- Trigger on anything but the literal `/dispatch` invocation.
