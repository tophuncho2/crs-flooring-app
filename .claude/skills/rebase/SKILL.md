---
name: rebase
description: Read-only pre-flight audit for "rebase one branch onto another, then fast-forward-merge it back" in the worktree layout (.bare + per-branch folders). The user names a TOPIC branch (rebased + merged from) and a BASE branch (rebased onto + merged into) and may drop hints about where code conflicts could live. Predicts code conflicts (without touching the tree), detects the DB model (separate-DB like dev↔staging, or shared-DB for a sub-branch off its base) and checks migration sync accordingly, then returns a structured report plus the exact rebase→merge runbook (fetch → rebase onto origin/BASE → force-with-lease push → db:deploy → ff-merge into BASE → push). Branch-agnostic — works for dev→staging today and dev-N→dev later with no edits. NEVER rebases, merges, pushes, fetches, or mutates anything. Explicit-only — invoke only on /rebase.
---

# /rebase

Pre-flight a planned **rebase + fast-forward merge**: take the **TOPIC** branch, rebase it onto **BASE**, then fast-forward-merge TOPIC into BASE. Answer three questions before the user runs a single git command:

1. **Will there be code conflicts?** — and if so, in which files / which commits.
2. **Are the two branches' DBs in sync?** — migrations, schema, and which DB ends up needing `db:deploy`.
3. **What exactly do I run, and in which worktree?** — the runbook.

This skill **only inspects and predicts**. The user runs the rebase and merge themselves.

## Vocabulary (used throughout)

- **TOPIC** — the branch being **rebased** and then **merged from**. Its history gets rewritten by the rebase. (Today: `dev`.)
- **BASE** — the branch TOPIC is rebased **onto** and merged **into**. (Today: `staging`.)
- Generic: today it's `dev` → `staging`. Soon it's `dev-1` / `dev-2` / `dev-3` → `dev`. The skill never hardcodes names — it reads them from the invocation.

## Determine TOPIC and BASE first

The user states them in the invocation ("rebase dev onto staging then merge into staging" → TOPIC=`dev`, BASE=`staging`; "rebasing dev-1" with the dev context → TOPIC=`dev-1`, BASE=`dev`). The grammar is stable:

- "rebase **X** onto **Y**" / "rebasing **X** … merging into **Y**" → TOPIC=X, BASE=Y.
- "merge into **Y**" alone, plus "rebasing **X**" → same mapping.

If you can read both branches from the message, **proceed without asking**. Only if TOPIC or BASE is genuinely ambiguous (neither stated, can't infer from cwd/context) ask one question: which branch is being rebased (TOPIC) and which it lands on (BASE). Confirm both branches exist (`git worktree list --porcelain`, `git branch`); if a named branch has no worktree, that's fine for read-only inspection but note it (the runbook needs the TOPIC worktree to exist).

## Repo layout (read this first)

Bare repo + worktrees, **not** a single checkout:

- `.bare/` — the git directory.
- `dev/`, `staging/`, `main/`, `dev-1/`, … — one folder per branch, each a worktree with its **own persistent `.env`**.
  - Each folder's `.env` points at a DB. There is **no env swapping** — never `cp` an env.
  - **Two DB models, detect which applies** (compare the DATABASE_URL hosts — Step 2):
    - **Separate-DB** (top-level branches): `dev/.env` → dev DB, `staging/.env` → staging DB. The two branches have distinct DBs that each need their own `db:deploy`.
    - **Shared-DB** (sub-branches): branches forked off a base **share the base's DB** — e.g. branches off `staging` point their `.env` at the **staging** DB. Here there's only one DB; `db:deploy` against it is the only DB step, and "are the DBs in sync" is moot (it's one DB).
- All worktrees share `.bare/`, so any worktree sees every branch and `origin/*`.

Resolve worktree paths with `git worktree list --porcelain`; never assume the cwd is any particular branch. Call the resolved paths `TOPIC_WT` and `BASE_WT`.

## Hard rules

- **You do not rebase, merge, push, pull, fetch, checkout, cherry-pick, or `db:deploy` anything.** Read-only inspection only. The user runs every mutating command.
  - Allowed read-only: `git status`, `git log`, `git rev-parse`, `git rev-list`, `git merge-base`, `git diff` (no `--apply`), `git merge-tree` (writes only to the object db, leaves no ref/worktree/index change — safe to use for prediction), `git ls-tree`, `git ls-remote`, `git check-ignore`, `git branch`, `git worktree list`, `Read`/`cat` on tracked or env files, `diff -q`, `comm`, `ls`, `grep`.
  - **`git fetch` is NOT allowed.** Your `origin/*` refs are only as fresh as the last fetch — say so, and make `git fetch origin` step 1 of the runbook.
  - Do **not** create a scratch worktree to test-rebase. Predict statically with `git merge-tree`; be honest that it's a prediction.
- **No auto-fix.** A failing check yields a fix instruction; the user runs it.
- **Never write to any `.env`.** Read them only to compare DATABASE_URL **hosts**; never print credentials.
- **Explicit-only.** Run only on the literal `/rebase`. Never on "rebase it", "sync the branches", "ship".

## Step 1 — Resolve refs

- `git worktree list --porcelain` → `TOPIC_WT`, `BASE_WT`.
- `MB=$(git merge-base BASE TOPIC)` — the fork point. Everything keys off this.
- Pick the comparison tip for each branch deliberately:
  - Compare against **local** `TOPIC` and **local** `BASE` (that's what the user will rebase), **and** flag drift vs `origin/*` separately (Step 2 git state). The rebase target in the runbook is `origin/BASE` after a fetch, so call out if local BASE ≠ origin/BASE.

If `TOPIC_WT` is missing → verdict **CANNOT AUDIT** (the rebase has to run in the topic worktree). Remediation: `git worktree add` it. Stop.

## Step 2 — Read-only sweep

Tag every finding **BLOCKER**, **WARNING**, or **OK**. Run all checks even if early ones fail — one full pass.

### Git state

- **OK / no-op:** `git rev-list --count BASE..TOPIC` is 0 → TOPIC has nothing to merge into BASE; the whole operation is a no-op. Say so.
- **OK / already current:** `git rev-list --count TOPIC..BASE` is 0 → BASE is already an ancestor of TOPIC; the rebase is a no-op (TOPIC already sits on top of BASE) and the merge is a plain fast-forward. Still run the DB checks.
- BLOCKER: **TOPIC worktree dirty** — `git -C "$TOPIC_WT" status --porcelain` non-empty. `git rebase` refuses with a dirty tree. Fix: commit / stash / discard in the TOPIC folder.
- WARNING: **BASE worktree dirty** — `git -C "$BASE_WT" status --porcelain` non-empty. The ff-merge needs a clean BASE tree; flag it now.
- BLOCKER: local `TOPIC` behind `origin/TOPIC` (`git rev-list --count TOPIC..origin/TOPIC` > 0) — you'd rebase a stale topic. Fix: in TOPIC folder, `git pull --ff-only origin TOPIC`.
- WARNING: local `BASE` behind `origin/BASE` (`git rev-list --count BASE..origin/BASE` > 0) — the runbook rebases onto `origin/BASE`, so the prediction below (computed against local BASE) may understate conflicts. Note it; the user should fetch and re-run.
- WARNING: local `BASE` ahead of `origin/BASE` (`git rev-list --count origin/BASE..BASE` > 0) — BASE has unpushed commits; after the ff-merge they ride along on the push. Heads-up.
- **WARNING (history-rewrite blast radius):** rebasing TOPIC **rewrites its history**, so anyone/anything built on TOPIC must rebase too. Check for branches forked off TOPIC: `git branch --contains $MB` and any branch whose merge-base with TOPIC is below TOPIC's current tip (e.g. `dev-1`, `dev-2` off `dev`). If found, list them — they'll each need a follow-up rebase, and the TOPIC push will require `--force-with-lease`. This is the single most important warning when TOPIC has downstream branches.

### Code conflict prediction

The user will name **hint areas** (files/dirs/modules where they expect trouble). Center the report on those, then widen.

1. **Conflict surface (file overlap):** files changed on both sides since the fork point.
   - TOPIC side: `git diff --name-only $MB TOPIC`
   - BASE side: `git diff --name-only $MB BASE`
   - Intersection = the files a rebase could conflict on. Files changed on only one side rebase cleanly.
2. **Conflict prediction (content):** `git merge-tree --write-tree --name-only BASE TOPIC` (git ≥ 2.38; this repo is 2.50).
   - Exit 0 → no conflicts predicted. Exit 1 → it prints the conflicted paths. This simulates a **3-way merge** of the two tips — a strong predictor of the rebase conflict surface, but **not commit-exact**: a real rebase replays TOPIC's commits one at a time, so the conflict may surface in a specific commit and a clean-looking file here can still need a touch. State that caveat.
3. **Which commits touch the surface:** for each overlapping file, `git log --oneline $MB..TOPIC -- <file>` so the user knows which replayed commit will stop the rebase. Keep it short — list the file → commit subjects.
4. **Hint cross-check:** for each user hint area, say explicitly whether it's in the conflict surface (❗ likely conflict), changed on only one side (clean), or untouched since the fork (no risk). If a hint area shows nothing, say so plainly — don't manufacture risk.

- WARNING: any file in the conflict surface (manual resolution likely).
- WARNING: a hint area lands in the surface — call it out by name first.
- OK: empty intersection and `merge-tree` clean → predict a conflict-free rebase (still caveat the per-commit nature).

### DB / migration sync

Migrations are folders under `packages/db/prisma/migrations/`, each with a `migration.sql`; Prisma applies them in **name order** (the `YYYYMMDDHHMMSS_` prefix). Each branch has its own DB via its worktree `.env`.

1. **Migration set diff** (the heart of "are the DBs in sync"):
   - TOPIC's set: `git ls-tree -r --name-only TOPIC -- packages/db/prisma/migrations/ | grep migration.sql`
   - BASE's set: same for `BASE`. Diff the two folder-name sets (`comm`).
   - **Only-on-BASE** migrations: after the rebase, TOPIC's tree gains them → the **TOPIC DB** needs `db:deploy` to catch up. List them.
   - **Only-on-TOPIC** migrations: after the ff-merge, BASE's tree gains them → the **BASE DB** needs `db:deploy`. List them.
   - If both sets are equal → DBs are migration-in-sync; `db:deploy` will no-op on both. Say so.
2. **Interleave / out-of-order risk:** if an only-on-BASE migration has a timestamp prefix **earlier** than an already-applied-on-TOPIC migration (i.e. a BASE migration's name sorts before a migration the TOPIC DB has already run), Prisma will report a migration applied "out of order" / a failed/missing state on the next `db:deploy`. Compare the max-applied TOPIC prefix against incoming BASE prefixes.
   - WARNING: incoming migration sorts before TOPIC's newest already-present migration. Name both; the user may need `prisma migrate resolve` or to recreate the migration with a later timestamp.
3. **Destructive SQL:** grep each incoming `migration.sql` (both directions) for `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `ALTER ... RENAME`, `DROP CONSTRAINT`.
   - WARNING: destructive op — name the migration, the keyword, and which DB it hits. Destructive migrations on a shared/long-lived DB (BASE) deserve a deliberate look.
4. **Schema drift / orphan edit:** `git diff --stat BASE TOPIC -- packages/db/prisma/schema.prisma`. If `schema.prisma` differs but there's no corresponding new migration folder to account for it, `db:migrate:dev` was likely never run.
   - BLOCKER: `schema.prisma` changed on TOPIC with no matching new migration (orphan schema edit). Fix: in TOPIC folder, `npm run db:migrate:dev`, then re-run `/rebase`.
5. **Detect the DB model** (do this *before* reporting items 1–2 — it changes their meaning): read `TOPIC_WT/.env` and `BASE_WT/.env`, compare DATABASE_URL **hosts/db names only** (never print values).
   - **Shared-DB** (hosts/db match) — the **expected** state for a sub-branch off BASE (e.g. a branch off `staging` sharing the staging DB). There is **one** DB. The migration-set diff (items 1–2) still tells you which migration files the tree gains, but there's no "TOPIC DB vs BASE DB" sync question — a single `db:deploy` against the shared DB applies whatever the rebased tree carries. Report it as **shared-DB (expected for sub-branch)**, not a misconfiguration.
   - **Separate-DB** (hosts differ) — the dev↔staging case. Items 1–2 apply in full: the TOPIC DB catches up after the rebase, the BASE DB after the merge.
   - BLOCKER: `TOPIC_WT/.env` missing → `db:deploy` in the runbook has no DATABASE_URL.

## Step 3 — Output the report

Use exactly this shape. Keep it scannable. Per CLAUDE.md: headline + counts + TL;DR in chat, tables for the detail.

```
REBASE PRE-FLIGHT — <TOPIC> → rebase onto <BASE> → ff-merge into <BASE>   (worktree layout)
Verdict: <CLEAR | CLEAR WITH WARNINGS | CONFLICTS EXPECTED | UNSAFE | NO-OP | CANNOT AUDIT>
Refs as of last fetch — re-fetch is step 1 of the runbook.

═══ Summary ═══
Blockers: <N>   Warnings: <N>
Commits to replay (BASE..TOPIC):     <N>
Predicted conflict files:            <N>   (hint areas hit: <N>)
Migrations TOPIC DB will gain:       <N>   (<destructive> destructive)
Migrations BASE DB will gain:        <N>   (<destructive> destructive)
Downstream branches off TOPIC:       <N>   (will need re-rebase)

═══ Code conflicts ═══
Prediction: <clean | conflicts> (git merge-tree — 3-way of the tips; rebase replays per-commit, so treat as the surface, not the exact stop point)

| File | On TOPIC | On BASE | Predicted | First replayed commit to touch it |
|------|----------|---------|-----------|-----------------------------------|
| ...  | ✏️       | ✏️      | ❗ conflict | abc1234 "subject"                |

Hint areas:
- <hint> → ❗ in conflict surface | ✅ one-sided (clean) | ✅ untouched since fork

═══ DB / migration sync ═══
DB model: <shared-DB (one DB, expected for sub-branch off BASE) | separate-DB (TOPIC + BASE have distinct DBs)>
<if separate-DB:>
TOPIC DB and BASE DB: <in sync | out of sync>
- TOPIC DB will gain (apply after the rebase+push, in <TOPIC>/): <list or none>
- BASE DB will gain (apply after the merge, in <BASE>/):         <list or none>
<if shared-DB:>
- One DB. Migration files the rebased tree gains: <list or none> → one db:deploy against the shared DB.
- ⚠️ <out-of-order / destructive / orphan-schema notes>

═══ Blockers ═══
❌ <title> — what's wrong / why it matters / Fix: <command + which folder>

═══ Warnings ═══
⚠️ <same shape>

═══ Notes ═══
<no-ops, assumptions, anything dropped>
```

Append the runbook **only when the verdict is CLEAR, CLEAR WITH WARNINGS, or CONFLICTS EXPECTED** (conflicts are expected and resolvable, not a blocker). Substitute real paths/branch names. Drop `db:deploy` lines where that DB gains nothing (or keep with `# no-op`).

```
═══ Runbook ═══   (matches the user's flow: fetch → rebase → force-push → db:deploy, then merge on BASE)
cd "<TOPIC_WT>"
git fetch
git rebase origin/<BASE>
#   on conflict: edit files → git add -A → git rebase --continue   (git rebase --abort to bail)
git push --force-with-lease origin <TOPIC>   # rebase rewrote history — plain push rejects
#   NOTE: any branch forked off <TOPIC> (<downstream list>) must now rebase onto the new <TOPIC>
npm run db:deploy                            # ran here, in <TOPIC>/, against <TOPIC's .env DB>
                                             #   separate-DB: catches the TOPIC DB up to <BASE>'s migrations
                                             #   shared-DB:   the one db:deploy; skip if the tree gained no migrations

cd "<BASE_WT>"
git merge --ff-only <TOPIC>                  # ff — TOPIC now sits directly on top of BASE
git push origin <BASE>
npm run db:deploy                            # separate-DB only: applies TOPIC's new migrations to the BASE DB
                                             #   (run manually; no-op if "BASE DB will gain" was empty)
                                             #   omit entirely in the shared-DB case — already deployed above
```

- **CLEAR** → print runbook as-is.
- **CLEAR WITH WARNINGS** → precede with `Review the warnings above before running.`
- **CONFLICTS EXPECTED** → print runbook; before it, `Expect to resolve conflicts at step 2 — see the conflict table for the files and the commits that stop the rebase.`
- **UNSAFE** → do **not** print the runbook; the blocker fix list is the deliverable.
- **NO-OP** → explain why (nothing to merge / already current) and stop.
- **CANNOT AUDIT** → explain what's missing and stop.

## What this skill does NOT do

- Rebase, merge, push, pull, fetch, checkout, cherry-pick, or `db:deploy` anything.
- Create scratch worktrees or actually attempt the rebase.
- Write or swap any `.env`.
- Auto-fix any blocker.
- Run on anything but the literal `/rebase` invocation.
