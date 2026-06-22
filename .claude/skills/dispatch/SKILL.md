---
name: dispatch
description: Split a body of work across the dev-N branches without two branches ever touching the same file. The dispatch analog of /newsession — partitions the work into a non-overlapping file-ownership map, then runs ONE research+writer agent pair per branch (a deep newsession-level researcher feeds a paired writer that authors the brief) so the briefs are produced in parallel, not written serially in the main thread. Each brief is ONE focused task: it states the session's intent, flags the decisions to make and potential gaps for that branch to solve, and names the research skill to run. The dispatcher window does not problem-solve or negotiate the work — it just starts the other windows; the heavy thinking happens in each dev-N session. Editing skill (writes briefs, never code). Explicit-only — invoke on /dispatch.
---

# /dispatch

`/dispatch <the work to split across branches>` makes you the dispatcher. The user gives you a checklist of things that need to happen — sometimes talked through with you first, sometimes dropped in finished in one prompt. You partition the files so no two branches collide, then **fan out one research+writer agent pair per branch** to produce one self-contained dispatch brief per branch under `.claude/DISPATCH/`. A `dev-N` session later pastes its brief **cold** — knowing nothing about the other branches — and executes from it.

**The mental model.** This window is the general contractor at the start of the day: the user walks in with intent, and your job is to assign each branch **one clear task** and send it off — fast, decisive, no negotiating the work here. The agents you fan out and the dev-N sessions that later receive the briefs are the branch managers and field supervisors: the real problem-solving, validation, and heavy thinking happen **in those windows**, not in this one. A brief's job is to tell the next session "here's the intent for this session, here are the decisions that do or may need to be made, run this skill" — and then get out of the way.

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
- **Flag** — a decision the branch must make, or a potential gap/ambiguity the research surfaced, written into the brief's **Flags** section with a visual marker (`⚑`). Flags are *not* pre-decided here — they exist so the receiving session (and the user flipping into that window) sees at a glance "this branch has something to settle." The dispatcher records flags; the branch resolves them.
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
- **This window dispatches; it does not problem-solve or negotiate.** Your job here is to *start the other windows*, not to solve the work. Make the **dispatch decisions** decisively and on your own — the partition, each branch's one task, its scope, its receiving-skill — by reading the code and the user's context; never put them to the user as menus, and never debate the work's solution, audit findings, or trade-offs in this chat. The only thing that comes back to this window is a genuine **dispatch blocker** (an unavoidable shared file that breaks the no-overlap guarantee, or a branch count you truly can't determine): surface it in one line and stop. Everything else is either resolved by reading code or deferred into the brief as a flag.
- **One specific task per branch.** Each brief is ONE coherent mission, tightly scoped — not ten unrelated things packed into one file. Don't pad a branch with extra work to fill it. If the user handed a branch several unrelated threads, that's a signal they belong on separate briefs/branches, not bundled — say so in one line rather than packing them.
- **Decisions and potential gaps go in the brief as flags, not in this chat.** Any work-level decision the branch must make, and any gap or ambiguity the research surfaced, goes into the brief's **Flags** section (marked `⚑`) for the receiving session to settle with the user *while it works*. The dispatcher stays quiet on the *how*; the branch window does the heavy thinking. This is what lets the user flip through windows and get an instant visual cue of which branches have something to discuss.
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

1. **Researcher (`Explore`, read-only, deep).** Scope it to that branch's ownership envelope only. Instruct it to do `/newsession`-level research across every relevant layer for that slice and return structured findings with real `path:line` cites: the exact files, the precise change points, the reference patterns to copy, the gotchas, and anything that would surprise the receiving session. **Explicitly have it call out two things separately:** (a) the **decisions the branch will need to make**, and (b) the **potential gaps or ambiguities** it spotted — so the writer can turn them into flags. The researcher surfaces these; it does not resolve them.
2. **Writer (`general-purpose`, can Write).** Hand it: the researcher's findings, the branch's ownership envelope (files it owns + explicit out-of-bounds, phrased without naming other branches), and the chosen receiving-skill. It writes `.claude/DISPATCH/<slug>.md` using the skeleton below — including a tight **Intent** line and a `⚑` **Flags** section built from the researcher's surfaced decisions/gaps (or "⚑ None" if the task is unambiguous). It must produce a professional, structured, self-contained brief scoped to **one task** — everything the receiving session needs, nothing that references another branch, and no pre-decided answers to the flags (those are the branch's to solve).

The writers do the authoring; you orchestrate and then validate. Do not collapse this into writing the briefs yourself.

### The brief skeleton (give this to each writer)

```
# <slug> — <one-line mission for THIS branch only — ONE task>

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence
map, NOT a substitute for reading the code.
1. FIRST run `/<named-skill>` to do your own end-to-end research and VALIDATE this
   brief against the live code. Trust the code over this file if they disagree —
   and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the
   user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode  → produce a plan and STOP for approval.
   - AUTO mode  → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
<1-3 sentences: why this branch exists this session and what "done" looks like at a
glance. One task — keep it focused.>

## ⚑ Flags — decisions to make / potential gaps
<Marked `⚑` so they're visible at a glance. Each: the decision or gap + the context
to resolve it. These are for THIS session to settle with the user while it works —
they are intentionally left open here, not answered.>
- ⚑ <decision the branch must make / gap to verify>
<If none: "⚑ None — intent is unambiguous. Research-validate, then execute.">

## Scope
In:  <exactly what this branch changes — the one task>
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

When the writers finish, verify the union of owned files is still a strict partition (no path in two briefs), then report. Keep it lean — this is a dispatch receipt, **not** a discussion of the work. Do not analyze findings, weigh trade-offs, or ask work-level questions here; those already live in each brief's Flags. The one signal worth surfacing is the **flag count per branch**, so the user knows at a glance which windows have something to settle. End with a ≤17-word commit message. Do not commit.

```
DISPATCH — <work summary> — <N> branches

═══ Branches ═══
<dev-1, dev-2, … from Step 1>

═══ File-ownership map (strict partition — no path twice) ═══
Branch   | One-task               | Owns (files / layers)  | Skill    | ⚑ Flags
---------+------------------------+------------------------+----------+--------
dev-1    | <the one task>         | <files / layer slice>  | /<skill> | <N>
dev-2    | <the one task>         | <files / layer slice>  | /<skill> | <N>

═══ Overlap check ═══
✅ / ❌  no file appears in two briefs
<if ❌: the shared file + how it's resolved>

═══ Briefs written ═══
- .claude/DISPATCH/<slug>.md — <branch> — <receiving skill> — <one-line task> — ⚑ <N> flag(s)

═══ Dispatch blockers ═══
- <unavoidable shared file / undeterminable branch count, or "none">
  (work-level decisions are NOT here — each lives in its brief's ⚑ Flags for that branch to solve)

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
- Problem-solve the work, debate findings, weigh trade-offs, or negotiate solutions in the dispatcher window — those belong in each brief's `⚑ Flags` for the branch session to solve.
- Pack one branch with multiple unrelated tasks — each brief is ONE focused task.
- Pre-decide a brief's flags — the dispatcher records the decision/gap; the receiving branch settles it with the user.
- Plan a single-branch surgical change — that's `/newsession`.
- Report branch ahead/behind state or open a dispatching session — that's `/dispatch-begin`.
- Trigger on anything but the literal `/dispatch` invocation.
