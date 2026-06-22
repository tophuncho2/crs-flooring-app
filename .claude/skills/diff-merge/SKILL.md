---
name: diff-merge
description: Pre-merge safety GATE for a planned promotion in the worktree layout (.bare + per-branch folders) — run it from dev or staging right before promoting up a level. Reports where the FROM and target branches sit, runs the full check gauntlet, sweeps the FROM→target diff for loose ends / bugs / leaks / dead code / unfinished threads, lists the DB migrations db:deploy will apply on the target, and reconciles MEMORY.md against what actually shipped. Returns a structured SAFE / SAFE WITH WARNINGS / UNSAFE verdict plus the exact merge commands to run in the target worktree. Read-only on the repo (never merges/pushes/deploys — the user does that); its one write is memory hygiene. Replaces the retired /promote. Explicit-only — invoke on /diff-merge.
---

# /diff-merge

`/diff-merge` is the gate you run **before promoting one branch up to the next**. You run it from the FROM branch; it audits the merge into the inferred target, tells you whether it's safe, what will happen, and the exact commands to run **in the target worktree folder**. It does not perform the merge — you do, manually, in that folder.

Reach for it twice on the promotion path: in `dev` before merging into `staging`, and again in `staging` before merging into `main`. It is the replacement for the retired `/promote`, generalized from "staging→main only" to "FROM→target".

## Repo layout (read this first)

This repo is a **bare repo + worktrees**, not a single checkout:

- `.bare/` — the git directory.
- `dev/`, `dev-1/ … dev-N/`, `staging/`, `main/` — one folder per branch, each a worktree with its **own persistent `.env`**.
  - Each folder's `.env` is already correct for its branch (`dev/.env` → dev DB, `staging/.env` → staging DB, `main/.env` → main DB). There is **no env swapping**.
- All worktrees share `.bare/`, so any worktree can resolve every branch's ref.
- The merge is done **manually by the user inside the target folder**. There is no `bin/diff-merge.sh`. You audit and hand back the commands.

## Promotion ladder (how the target is inferred)

| You run it from | Target (merge INTO) | Merge style |
|---|---|---|
| `dev` | `staging` | clean merge, or rebase dev onto staging then merge |
| `staging` | `main` | fast-forward (`--ff-only`) |

Any other branch → **CANNOT AUDIT**. On a `dev-N` sub-branch, that's `/dev-sync`'s job (catch up to dev first). On `main`, there's nothing above it. Resolve the current branch with `git rev-parse --abbrev-ref HEAD` and the worktree paths with `git worktree list --porcelain`.

## Hard rules

- **Never merge, push, pull, fetch, deploy, or checkout.** The user runs the merge themselves in the target folder. Allowed read-only git: `git status`, `git log`, `git rev-parse`, `git rev-list`, `git diff` (no apply), `git branch`, `git worktree list`, `git check-ignore`, plus `Read`/`cat`/`grep`/`ls`/`diff -q`. `git fetch` is **not** allowed — the user runs it as step 1 of the runbook.
- **No fetch — refs are local.** Comparisons are against **local** refs, only as fresh as the last fetch. Say so in the report and make `git fetch origin` the first runbook command.
- **Memory is the only thing you may write.** Step 5 may update/retire `MEMORY.md` entries to match what shipped. Nothing else on disk is mutated — never edit code, never auto-fix a blocker, never write any `.env`.
- **Run the gauntlet, read the result.** `npm run check` (= `bash bin/check.sh`: build → typecheck → lint → test) runs as part of the audit; a non-green gauntlet is a BLOCKER. Do not edit code to make it pass — report and stop.
- **DO NOT COMMIT.** The user commits. After authoring any memory change, provide a commit message of **≤17 words**; never commit it yourself, and never run migrations.
- **Drive, don't multiple-choice.** Surface genuine open questions (ambiguous target, destructive migration, stale memory) in the report; don't stop to offer menus.
- **Explicit-only.** Trigger on the literal `/diff-merge`. Never on "is it safe to merge", "promote it", "ship it".

## What "safe to promote" means here

After a clean `/diff-merge`, the user will — **in the target folder** — `git fetch origin`, bring the target current, merge FROM in, `npm run db:deploy` (applies pending Prisma migrations to the **target DB** via `main/.env`/`staging/.env`; no-op if none), then `git push origin <target>` (Railway redeploys). "Safe" = every precondition that flow depends on is currently true, the gauntlet is green, and nothing in the FROM→target diff looks dangerous.

## Step 1 — Resolve branches and worktrees

- `git rev-parse --abbrev-ref HEAD` → FROM. Map FROM to its target via the ladder; if FROM isn't `dev` or `staging`, verdict is **CANNOT AUDIT** — say which tool to use instead, stop.
- `git worktree list --porcelain` → absolute paths of the FROM and target worktrees (`FROM_WT`, `TARGET_WT`). If the target worktree is missing, **CANNOT AUDIT** — remediation: `git worktree add` it. Stop.

## Step 2 — Git-state sweep

Tag each finding **BLOCKER**, **WARNING**, or **OK**. Run every check even if an early one fails — the user wants the full picture in one pass.

- Commit positions: `git rev-list --left-right --count <target>...<from>` → `<behind>\t<ahead>`. Report where target sits (`git log -1 --format='%h %s' <target>`), where FROM sits, and the ahead/behind gap.
- BLOCKER: **target worktree dirty** — `git -C "$TARGET_WT" status --porcelain` non-empty. The ff-merge/pull will refuse. Fix: clean it in the target folder.
- WARNING: **FROM worktree dirty** — uncommitted changes won't be promoted (only committed + pushed FROM is). Heads-up, not a blocker.
- BLOCKER: local `<from>` **ahead** of `origin/<from>` (`git rev-list --count origin/<from>..<from>` > 0) — those commits would land on target without ever reaching `origin/<from>`. Fix: push FROM first, re-run.
- BLOCKER (staging→main only): `origin/main` not strictly behind `origin/staging` (`git rev-list --count origin/staging..origin/main` > 0) — `merge --ff-only` will fail. Inspect `git log origin/staging..origin/main`.
- WARNING: nothing to merge — FROM is not ahead of target. The promote is a no-op.

## Step 3 — Run the check gauntlet

From `FROM_WT`, run `npm run check` (`bash bin/check.sh`). Read its `═══ check summary ═══` table.

- BLOCKER: any of **build / typecheck / lint / test** failed — name the failing step and the log path. Nothing should be promoted on a red gauntlet.
- OK: all four green.

## Step 4 — Diff sweep (loose ends, dead code, leaks)

Sweep the FROM→target diff (`git diff <target>...<from>` and `--stat`) with `/dig`-style layer reasoning over `schema → domain → data → application → outbox → api → module dir → pages`:

- **Loose ends / unfinished threads** — a new domain rule with no use case calling it; a use case with no route exposing it; a validator field that doesn't match the use-case input type; a schema column with no migration.
- **Bugs / gaps / leaks** — wire mismatches, un-awaited promises, missing transaction locks, secrets/credentials in the diff, `console.log`/debug left in.
- **Dead code** — symbols, files, exports, or branches the diff orphaned (rip-outs that left references, or refs that lost their definition).
- **Open items** — things this session/branch plausibly meant to finish but didn't. List them as questions, not verdicts.

## Step 5 — Migrations + schema drift

- Pending migrations = folders under `packages/db/prisma/migrations/` on FROM but not on target: `git diff --name-only <target>..<from> -- packages/db/prisma/migrations/`. These are exactly what `npm run db:deploy` will apply to the **target DB**. List the folder names in order.
- WARNING: any pending `migration.sql` contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `ALTER ... RENAME`, or `DROP CONSTRAINT` — destructive on the target DB, and may break the still-running old app during the deploy window. Name the migration and the keyword.
- WARNING: more than 5 migrations pending — harder to debug a mid-apply failure.
- BLOCKER: **schema drift** — `packages/db/prisma/schema.prisma` modified more recently than the newest migration folder's timestamp prefix (an orphan schema edit; `db:migrate:dev` was never run). Fix: in `FROM_WT`, `npm run db:migrate:dev`, re-run `/diff-merge`. Apply `packages/db/scripts/guard-prisma.js`'s logic by inspection — do **not** execute it.
- Env hosts: compare `FROM_WT/.env` and `TARGET_WT/.env` `DATABASE_URL` **hosts only** (never print values). BLOCKER if they resolve to the same DB — `db:deploy` from the target folder would hit the wrong database. BLOCKER if `TARGET_WT/.env` is missing or `.env` isn't gitignored there.

## Step 6 — Memory hygiene (the one write)

Cross-check `MEMORY.md` + its entry files against what the diff actually shipped:

- Entry describes work the diff **completed** → flag to update/retire it (a project/epic memory that's now done).
- Entry names a file/flag/column the diff **removed or renamed** → flag as stale.
- Net-new convention in the diff with **no** memory → flag as worth recording.

Make the edits in the memory dir when they're unambiguous; otherwise list them for the user. This is the only place `/diff-merge` writes.

## Step 7 — Report

```
DIFF-MERGE — <from> → <target>   (worktree layout)
Verdict: <SAFE | SAFE WITH WARNINGS | UNSAFE | CANNOT AUDIT>
Refs are LOCAL (no fetch) — re-fetch is step 1 of the runbook.

═══ Branch positions ═══
target  <target> @ <sha> "<subject>"
from    <from>   @ <sha> "<subject>"   (ahead <N>, behind <N>)

═══ Summary ═══
Blockers: <N>   Warnings: <N>
Gauntlet: <build/typecheck/lint/test — pass | FAILED at <step>>
Pending migrations: <N>  (<destructive count> destructive)
Loose ends: <N>   Dead code: <N>   Open items: <N>   Memory flags: <N>

═══ What happens when you merge <from> → <target> ═══
- <ff to <from sha> "<subject>" | merge commit>
- Apply <N> migration(s) to the <target> DB:
    • 20260622130000_warehouse_drop_number  ⚠️ DROP COLUMN
- Push <target> to origin (Railway redeploys)
- <target>/.env stays on the <target> DB; <from>/ untouched

═══ Blockers ═══   (❌  what's wrong / why it matters / fix + the folder it runs in)
═══ Warnings ═══   (⚠️  same shape)
═══ Loose ends & dead code ═══   (per finding, with path:line)
═══ Open items ═══   (questions — what this branch may not have finished)
═══ Memory hygiene ═══   (entry → update / retire / add; ✅ if edited, ⚠️ if flagged)
═══ Notes ═══

═══ Run these in the <target>/ folder ═══   (only if SAFE / SAFE WITH WARNINGS)
cd "<TARGET_WT>"
git fetch origin
git pull --ff-only origin <target>
git merge <from>            # staging→main: add --ff-only
npm run db:deploy           # only if migrations pending; no-op otherwise
git push origin <target>
```

- **SAFE** → print the runbook as-is.
- **SAFE WITH WARNINGS** → print it, preceded by `Review the warnings above before running.`
- **UNSAFE** → do **not** print the runbook; the blocker fix-list is the deliverable.
- **CANNOT AUDIT** → explain what's missing and stop.
- Zero pending migrations → drop the `db:deploy` line (or mark it `# no-op`); never imply migrations exist when they don't.

## What this skill does NOT do

- Merge, push, pull, fetch, checkout, or deploy anything — the user runs the merge in the target folder.
- Swap or write any `.env` (the worktree model has no env swap).
- Edit code or auto-fix any blocker — it reports and stops; code fixes are the user's, the gauntlet is `/check`.
- Run migrations or `npm run db:deploy` (the user runs those), or execute `guard-prisma.js` (reasons by inspection).
- Catch a `dev-N` worktree up to `dev` — that's `/dev-sync`. Open a dispatching session — that's `/dispatch-begin`.
- Write anything outside the memory dir.
- Commit the memory change (provide a ≤17-word message; the user commits).
- Trigger on anything but the literal `/diff-merge` invocation.
