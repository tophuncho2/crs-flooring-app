---
name: promote
description: Read-only safety audit for a planned staging → main promotion in the worktree layout (.bare + per-branch folders). Sweeps git state across the main and staging worktrees, env files, pending migrations, and schema drift, then returns a structured PASS / FAIL report plus the exact commands to run in the main/ folder. NEVER merges, pushes, deploys, or mutates anything — the user runs the merge themselves in the main worktree. Explicit-only — invoke only on /promote.
---

# /promote

Audit a planned staging → main promotion. Output a structured report telling the user whether it is safe to merge `staging` into `main`, what will happen if they do, and the exact commands to run **in the `main/` worktree folder**.

## Repo layout (read this first)

This repo is a **bare repo + worktrees**, not a single checkout:

- `.bare/` — the git directory.
- `main/`, `staging/`, `dev/` — one folder per branch, each a worktree with its **own persistent `.env`**.
  - `main/.env` points at the **main DB**. `staging/.env` points at the **staging DB**.
  - There is **no env swapping**. You never `cp .env.main .env`. Each folder's `.env` is already correct for its branch.
- All worktrees share the same refs (they share `.bare/`), so any worktree can see `staging`, `main`, `origin/*`.

Promotion is done **manually by the user inside the `main/` folder** — there is no `bin/promote.sh` anymore. You only audit and hand back the commands. Do not assume the cwd is any particular worktree; resolve paths with `git worktree list --porcelain`.

## Hard rules

- **You do not merge, push, pull, fetch, deploy, or checkout anything.** Only read-only inspection. The user runs the merge themselves in `main/`.
  - Allowed read-only: `git status`, `git log`, `git rev-parse`, `git rev-list`, `git diff` (no `--apply`), `git ls-remote`, `git check-ignore`, `git branch`, `git worktree list`, `cat`/`Read` on tracked or env files, `diff -q`, `ls`, `grep`. `git fetch` is **not** allowed — the user runs it as part of their promote.
  - Because you don't fetch, your `origin/*` refs are only as fresh as the last fetch. Say so in the report and make `git fetch origin` the first command in the runbook.
- **You do not auto-fix anything.** If a check fails, the report tells the user the fix; they run it.
- **You never write to any worktree's `.env`.** Read them to compare DATABASE_URL hosts; never print credentials.
- **Explicit-only.** Run only when the user types `/promote`. Never on phrases like "ship", "deploy", "promote it".

## What "safe to promote" means here

The user will, **in the `main/` folder**:
1. `git fetch origin`
2. `git pull --ff-only origin main` — bring the main worktree current
3. `git merge --ff-only staging` — fast-forward main to staging
4. `npm run db:deploy` — apply any pending Prisma migrations to the **main DB** (uses `main/.env`; no-op if none pending)
5. `git push origin main` — Railway auto-deploys

"Safe" = every precondition that flow depends on is currently true, and nothing about the staging↔main diff looks dangerous.

## Step 1 — Resolve the worktrees

- Run `git worktree list --porcelain`. Identify the absolute paths of the `main` and `staging` worktrees. Call them `MAIN_WT` and `STAGING_WT`.
- If the `main` worktree is missing, verdict is **CANNOT AUDIT** — remediation: "No `main` worktree found; `git worktree add` it before promoting." Stop.

## Step 2 — Read-only sweep

Tag each finding **BLOCKER**, **WARNING**, or **OK**. Run all checks even if early ones fail — the user wants the full picture in one pass.

### Git state

- BLOCKER: **main worktree dirty** — `git -C "$MAIN_WT" status --porcelain` non-empty. `pull --ff-only` / `merge --ff-only` will refuse. Fix: clean it (commit, stash, or discard) in `main/`.
- WARNING: **staging worktree dirty** — `git -C "$STAGING_WT" status --porcelain` non-empty. Those uncommitted changes will **not** be promoted (only committed+pushed staging is). Heads-up, not a blocker.
- BLOCKER: local `staging` behind `origin/staging` (`git rev-list --count staging..origin/staging` > 0). Fix: in `staging/`, `git pull --ff-only origin staging`.
- BLOCKER: local `staging` **ahead** of `origin/staging` (`git rev-list --count origin/staging..staging` > 0). The merge takes local staging, but those commits aren't on origin/staging — they'd land on main without ever being on origin/staging. Fix: in `staging/`, `git push origin staging`, then re-run `/promote`.
- BLOCKER: local `main` **ahead** of `origin/main` (`git rev-list --count origin/main..main` > 0) — someone committed directly into the main worktree. `pull --ff-only` will fail. Fix: inspect `git -C "$MAIN_WT" log origin/main..main` and reconcile.
- BLOCKER: `origin/main` not strictly behind `origin/staging` — `git rev-list --count origin/staging..origin/main` > 0 means main has commits staging lacks, so `git merge --ff-only staging` fails. Fix: inspect `git log origin/staging..origin/main`; merge those into staging first or investigate the divergence.
- WARNING: nothing to merge — `git rev-list --count origin/main..origin/staging` is 0. The promote is a no-op.

### Env files (worktree model)

- BLOCKER: `MAIN_WT/.env` missing. Without it `db:deploy` has no DATABASE_URL.
- BLOCKER: `MAIN_WT/.env` and `STAGING_WT/.env` resolve to the **same DATABASE_URL host/db**. Running `db:deploy` from `main/` would hit the **staging** DB. Compare hosts only; never print values.
- BLOCKER: `.env` not gitignored in the main worktree (`git -C "$MAIN_WT" check-ignore .env` empty).
- WARNING: `MAIN_WT/.env` missing a `DATABASE_URL=` or `AWS_S3_BUCKET_NAME=` line.

### Migrations

- Pending migrations = folders under `packages/db/prisma/migrations/` on staging but not on origin/main: `git diff --name-only origin/main origin/staging -- packages/db/prisma/migrations/`. List the folder names.
- WARNING: any pending `migration.sql` contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `ALTER ... RENAME`, or `DROP CONSTRAINT`. Name the migration and keyword — these are destructive on the main DB and may break the still-running old app code during the deploy window. Consider push-before-migrate ordering (flag for the user; out of scope here).
- WARNING: more than 5 migrations pending — harder to debug if one fails mid-apply.
- OK: zero pending — `db:deploy` no-ops; the git half still runs.

### Drift

- BLOCKER: `packages/db/prisma/schema.prisma` modified more recently than the newest migration folder's timestamp prefix (orphan schema edit — `db:migrate:dev` was never run to generate the migration). Fix: in `staging/`, `npm run db:migrate:dev`, then re-run `/promote`.
- WARNING: the `guard:prisma` check would fail. Do **not** run it (side effects possible) — read `packages/db/scripts/guard-prisma.js` and apply its logic by inspection.

## Step 3 — Output the report

Use exactly this format. Keep it scannable.

```
PROMOTE AUDIT — staging → main   (worktree layout)
Verdict: <SAFE | SAFE WITH WARNINGS | UNSAFE | CANNOT AUDIT>
Refs as of last fetch — re-fetch is step 1 of the runbook.

═══ Summary ═══
Blockers: <N>
Warnings: <N>
Pending migrations: <N>  (<destructive count> destructive)
Commits to merge:    <N>

═══ What will happen when you merge staging → main ═══
- Fast-forward main to <staging short-sha> "<subject>"
- Apply <N> migration(s) to the main DB:
    • 20260602120000_adjustment_identity_search_indexes
    • 20260602130000_widen_bar  ⚠️ DROP COLUMN
- Push main to origin (Railway redeploys)
- main/.env stays pointed at the main DB; staging/ is untouched

═══ Blockers ═══
<For each:>
❌ <short title>
   What's wrong: <one line>
   Why it matters: <one line>
   Fix: <exact command(s), with the worktree folder they run in>

═══ Warnings ═══
<For each, same shape with ⚠️ prefix>

═══ Notes ═══
<e.g. "no migrations pending, db:deploy will no-op">
```

End the report with the runbook block **only when the verdict is SAFE or SAFE WITH WARNINGS**. Substitute the actual main worktree path:

```
═══ Run these in the main/ folder ═══
cd "<MAIN_WT>"
git fetch origin
git pull --ff-only origin main
git merge --ff-only staging
npm run db:deploy          # only if migrations pending; no-op otherwise
git push origin main
```

- **SAFE** → print the runbook as-is.
- **SAFE WITH WARNINGS** → print the runbook, preceded by the line `Review the warnings above before running.`
- **UNSAFE** → do **not** print the runbook. The fix list is the deliverable.
- **CANNOT AUDIT** → explain what's missing and stop.

If there are zero pending migrations, drop the `npm run db:deploy` line from the runbook (or keep it with a `# no-op` comment) — your call, but don't imply migrations exist when they don't.

## What this skill does NOT do

- Merge, push, pull, fetch, checkout, or deploy anything.
- Swap or write any `.env` (the worktree model has no env swap).
- Auto-fix any blocker.
- Run on phrases other than the literal `/promote` invocation.
