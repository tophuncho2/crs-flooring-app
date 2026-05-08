---
name: promote
description: Read-only safety audit for a planned staging → main promotion. Reads bin/promote.sh, sweeps git state, env files, pending migrations, and schema drift, then returns a structured PASS / FAIL report with actionable remediation steps. NEVER runs bin/promote.sh or any state-mutating command — the user runs the script themselves in the terminal. Explicit-only — invoke only on /promote.
---

# /promote

Audit a planned staging → main promotion. Output a structured report telling the user whether it is safe to run `bin/promote.sh`, and if not, exactly what to do to make it safe.

## Hard rules

- **You do not run `bin/promote.sh`.** Ever. Not even with confirmation. The user runs it themselves.
- **You do not run any command that mutates state.** No `git fetch`, no `git pull`, no `git checkout`, no `cp`, no `npm run db:*` commands that alter the DB, no writes. Only read-only inspection.
  - Allowed read-only: `git status`, `git log`, `git rev-parse`, `git rev-list`, `git diff` (without `--apply`), `git ls-remote`, `git check-ignore`, `git branch`, `cat`/`Read` on tracked or env files, `diff -q`, `ls`, `grep`. Note: `git fetch` is **not** allowed even though it's "just" updating refs — the user runs it as part of the script.
- **You do not auto-fix anything.** If a check fails, the report tells the user the fix; they run it.
- **`bin/promote.sh` is for code-only promotes.** If one or more migrations are pending (any folder under `packages/db/prisma/migrations/` is on origin/staging but not origin/main), the verdict is `MANUAL — MIGRATIONS PRESENT` and no `Run: bin/promote.sh` line is printed. The full audit still runs — the user needs the context to plan the manual one-at-a-time flow. The bin's `db:deploy` step stays in place as a no-op safety boundary; the bin will only ever execute when there's nothing to deploy.
- **Explicit-only.** Run only when the user types `/promote`. Never on phrases like "ship", "deploy", "promote it".
- **No deviations from the script.** If `bin/promote.sh` does something the audit doesn't recognize, surface it in the report — do not silently approve.

## What "safe to promote" means here

The user is going to:
1. Manually run `bin/promote.sh` in their terminal
2. The script will fast-forward main from staging, apply pending Prisma migrations to the main DB via `db:deploy`, push, then return them to staging

"Safe" = every precondition the script depends on is currently true, and nothing about the diff between staging and main looks dangerous.

## Step 1 — Read the script the user is about to run

- `Read bin/promote.sh`. If it doesn't exist, the report's verdict is **CANNOT AUDIT** with remediation: "Create `bin/promote.sh` first." Stop there.
- Confirm its contents match the expected staging→main flow (git fetch → checkout main → pull --ff-only → merge --ff-only staging → cp `.env.main` → `npm run db:deploy` → git push origin main → checkout staging → cp `.env.staging`).
- If the script does anything outside that scope (force pushes, resets, prod-only commands, extra branches), the report's verdict is **UNSAFE** with that as a blocker — the audit cannot reason about behavior it doesn't expect.

## Step 2 — Run the read-only sweep

Tag each finding as **BLOCKER**, **WARNING**, or **OK**. Run all checks even if early ones fail — the user wants the full picture in one pass, not a fail-fast trickle.

### Git state

- BLOCKER: `git status --porcelain` non-empty (uncommitted or untracked changes).
- BLOCKER: current branch is not `staging`.
- BLOCKER: local `staging` is behind `origin/staging` (`git rev-list --count staging..origin/staging` > 0). Fix: `git pull --ff-only origin staging`.
- BLOCKER: local `staging` is **ahead** of `origin/staging` (`git rev-list --count origin/staging..staging` > 0). The script merges local staging, but the audit compares origin/main vs origin/staging — unpushed commits would silently land on main. Fix: `git push origin staging` first, then re-run `/promote`.
- BLOCKER: main is **not** strictly behind staging — `git rev-list --count origin/staging..origin/main` > 0 means main has commits staging doesn't, and `git merge --ff-only staging` from main will fail.
- WARNING: nothing to merge — `git rev-list --count origin/main..origin/staging` is 0. Running the script is a no-op, not strictly unsafe.

### Env files

- BLOCKER: `.env`, `.env.staging`, or `.env.main` missing.
- BLOCKER: any of the three not gitignored (`git check-ignore .env .env.staging .env.main` doesn't list all three).
- BLOCKER: `.env` does not currently match `.env.staging` (`diff -q .env .env.staging` reports differ). The script assumes the user is starting from a staging-active env.
- BLOCKER: `.env.main` and `.env.staging` have **identical** `DATABASE_URL` lines. Strong signal that one of them is misconfigured. Do not print the values — only that they match.
- WARNING: either env file is missing a `DATABASE_URL=` line or an `AWS_S3_BUCKET_NAME=` line.

### Migrations

- Identify pending migrations: any folder under `packages/db/prisma/migrations/` whose name is on staging but not on origin/main. Use `git diff --name-only origin/main origin/staging -- packages/db/prisma/migrations/`. List the folder names.
- BLOCKER: `packages/db/prisma/schema.prisma` has a modification timestamp newer than the most recent migration folder's timestamp prefix (orphan schema change — a schema edit was made but `db:migrate:dev` was never run to generate the migration file).
- WARNING: any pending migration's `migration.sql` contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `ALTER ... RENAME`, or `DROP CONSTRAINT`. List which migration and which keyword. These are destructive on main and may break old running app code during the deploy window.
- WARNING: more than 5 migrations pending. Many at once is harder to debug if one fails mid-apply.
- OK: zero migrations pending — `db:deploy` will be a no-op, but the git half of the script still runs.

### Drift

- WARNING: `npm run guard:prisma` would fail if run. Do not actually run it (it may have side effects). Instead, read `packages/db/scripts/guard-prisma.js` to understand what it checks, and apply that check by inspection if practical.
- OK: nothing else to flag.

## Step 3 — Output the report

Use exactly this format. Keep it scannable. Do not pad with prose.

```
PROMOTE AUDIT — staging → main
Verdict: <SAFE | SAFE WITH WARNINGS | UNSAFE | CANNOT AUDIT>

═══ Summary ═══
Blockers: <N>
Warnings: <N>
Pending migrations: <N>  (<destructive count> destructive)
Commits to merge:    <N>

═══ What will happen if you run bin/promote.sh ═══
- Fast-forward main to <staging short-sha> "<subject>"
- Apply <N> migration(s) to main DB:
    • 20260507120000_add_foo
    • 20260508090000_widen_bar  ⚠️ DROP COLUMN
- Push main to origin
- Return to staging branch with .env back to staging

═══ Blockers ═══
<For each blocker:>
❌ <short title>
   What's wrong: <one-line description>
   Why it matters: <one-line>
   Fix: <exact command or steps to run>

═══ Warnings ═══
<For each warning, same shape as above but with ⚠️ prefix>

═══ Notes ═══
<Anything else worth knowing — e.g. "no migrations pending, db:deploy will no-op">
```

If verdict is **SAFE**: end the report with the literal line `Run: bin/promote.sh` (no extra commentary). The user will copy that into their terminal.

If verdict is **SAFE WITH WARNINGS**: end with `Run: bin/promote.sh   (review warnings above first)`.

If verdict is **UNSAFE**: do **not** print a `Run:` line at all. The fix list is the deliverable.

If verdict is **CANNOT AUDIT**: explain what's missing (e.g. "bin/promote.sh does not exist") and stop.

## Remediation reference (use these exact fixes when the matching blocker fires)

- Uncommitted/untracked changes → `git stash --include-untracked` or commit them
- On wrong branch → `git checkout staging`
- Local staging behind origin → `git pull --ff-only origin staging`
- Main has commits staging doesn't → manually inspect `git log origin/staging..origin/main`. Either merge those commits into staging first, or investigate why main diverged. The promote flow assumes main only ever moves forward via this script.
- `.env` not matching `.env.staging` → `cp .env.staging .env`
- `.env.main` `DATABASE_URL` matches `.env.staging` → re-pull the correct prod DATABASE_URL from Railway and rewrite `.env.main` by hand
- Env file not gitignored → add the filename to `.gitignore` and `git rm --cached <file>` if it was already tracked
- Orphan schema change → `cp .env.staging .env && npm run db:migrate:dev` to generate the migration file, then re-run `/promote`
- Destructive migration warning → manual review. Consider whether running app code (the version about to be live on main between push and pod restart) can survive the missing column / renamed table. If not, the script's order needs to be flipped (push first, migrate after) — but that's outside this skill's scope; flag for the user.

## What this skill does NOT do

- Run `bin/promote.sh`.
- Run any command that changes the working tree, refs, env files, or DB.
- Auto-fix any blocker.
- Deploy, push, merge, or migrate anything.
- Run on phrases other than the literal `/promote` invocation.
