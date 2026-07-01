---
name: session-confirm
description: Trust-but-verify confirmation of your own "I already committed / pushed / ran the migration" claims. When you tell Claude the work is done and the tree is clean and it reflexively doubts you, run /session-confirm — it checks the actual git and database state (working tree clean, local HEAD landed on origin, Prisma migrations applied with no drift) and confirms you're right (you usually are) instead of asking you to redo something it never checked. Knows the dev family shares ONE database, so a sibling sub-branch's in-flight migration showing in the shared DB is expected, not drift. Read-only recon — never commits, pushes, or runs a migration. Explicit-only — invoke on /session-confirm.
---

# /session-confirm

You already did the thing — committed, pushed, ran the migration — and Claude is second-guessing you ("are you sure you committed?", "did you run the migration yet?") without checking. `/session-confirm` is the tool you run instead of typing that correction by hand. It reads the **actual git and DB state**, confirms your claim with evidence, and defaults to *you're right* — because you almost always are.

It answers three questions, in order: **is the tree clean (committed)?** → **did my push land on origin?** → **are migrations applied with no drift?** — then hands back a one-glance verdict.

## The model — branch families and the shared dev DB

The verdict for "migrations applied / no drift" depends on **which branch family** you're on. Resolve it from the branch name (`git rev-parse --abbrev-ref HEAD`):

| Family | Branches | Database | "DB has a migration missing from my local folder" means… |
|---|---|---|---|
| **dev** | `dev`, `dev-1` … `dev-N` | **one shared dev DB** | a **sibling** sub-branch applied its migration to the shared DB. **Expected**, not drift — it reconciles when branches merge into `dev`. |
| **staging** | `staging` | own staging DB | a **real anomaly** — flag it. |
| **main** | `main` | own prod DB | a **real anomaly** — flag it. |

This is the whole reason the skill exists in this repo: you dispatch schema edits across dev sub-branches that **share a database**, so concurrent/out-of-order migrations against that one DB are normal *within the dev family* and must not be reported as drift.

"Real drift" — worth flagging on **any** branch — is the opposite direction: a **local** migration folder **not yet applied** to the DB, or `schema.prisma` edited with **no matching migration** authored (the orphan-edit / `guard-prisma` concern).

## Hard rules

- **Default to trusting the user; verify, then confirm.** The user is almost always right. Your job is to produce the *evidence* they're right — or the single precise reason they're not — never to reflexively doubt them or ask them to redo a step you haven't actually checked. If a check comes back clean, say so plainly; don't hedge.
- **Read-only.** Allowed: `git status`, `git log`, `git rev-parse`, `git rev-list`, `git branch`, `git worktree list`, `git ls-remote`, `npm run db:migrate:status --workspace @builders/db` (`prisma migrate status` is a read-only query — it never applies anything), plus `Read`/`grep`/`ls`. **Never** `git commit`/`push`/`merge`/`checkout`/`fetch --prune`, **never** `db:migrate:dev`/`db:deploy`/`db:reset`, **never** edit a file. The user commits and runs migrations — always.
- **Check "did my push land" against the remote, live.** Use `git ls-remote origin <branch>` — it reads the remote SHA directly with no fetch and no local ref mutation. Never claim "not pushed" from a stale local `origin/<branch>` tracking ref.
- **Know the branch family before judging migrations.** Apply the table above. On the dev family, "applied to DB but missing locally" is **expected** (a sibling's migration in the shared DB) — confirm clean. On staging/main it's an anomaly.
- **Real drift is the other direction.** Local migration folder not yet applied, or a `schema.prisma` edit with no paired `migration.sql` under `packages/db/prisma/migrations/`. Detect the orphan edit by inspection (mirror `packages/db/scripts/guard-prisma.js`'s logic — do **not** execute a migration).
- **DO NOT COMMIT, never run migrations.** This skill only reports. In the rare case it writes anything, provide a commit message ≤17 words; the user commits.
- **Drive, don't multiple-choice.** If something is genuinely off, state the one issue and the exact command the *user* runs — don't offer menus.
- **Explicit-only.** Trigger on the literal `/session-confirm`. Never on "confirm this", "can you confirm", "I confirmed", or "yes".

## Step 1 — Resolve branch, family, worktree

- `git rev-parse --abbrev-ref HEAD` → current branch. Map it to a family: `dev`/`dev-N` → **dev** (shared DB); `staging` → **staging**; `main` → **main**. Anything else → note it and treat DB checks as single-owner.
- `git worktree list --porcelain` → the current worktree path (handle spaces in the repo path).
- The upstream is `origin/<branch>` (same name — each sub-branch pushes to its own remote branch).

## Step 2 — Committed? (working tree)

- `git status --porcelain` — empty = clean tree, everything committed. Non-empty = list what's still uncommitted (this is the honest answer if the user *thought* they committed but a file lingers).
- `git log -1 --format='%h %s (%cr)'` — show the tip commit so the user sees exactly what landed.

## Step 3 — Pushed? (local HEAD vs origin, live)

- `git rev-parse HEAD` → local tip.
- `git ls-remote origin "refs/heads/<branch>"` → the remote tip, read live.
- Compare: **equal** → pushed, ✅. Local **ahead** of remote (remote SHA is an ancestor of HEAD, or `git rev-list --count origin/<branch>..HEAD` > 0 after the live read) → **not fully pushed**, name how many commits are unpushed. Remote ahead of local → the user is behind origin (unusual mid-work; note it).
- If `ls-remote` fails (offline / no auth) → say the push check couldn't reach origin; don't guess.

## Step 4 — Migrated + no drift

- Run `npm run db:migrate:status --workspace @builders/db` from the repo root (the script lives in the `@builders/db` workspace, not root — a bare `npm run db:migrate:status` silently no-ops). It targets this worktree's `.env` DB — the shared dev DB on the dev family. Read the output:
  - **"Database schema is up to date!"** → ✅ applied, no drift. Done.
  - **"…have not yet been applied"** (local folders not in the DB) → **real "not yet applied."** If the user claimed they ran it, this is the one honest ❌ — the migration exists locally but isn't in the DB. Command the *user* runs: `npm run db:migrate:dev` (or `db:deploy` on a deployed env).
  - **"…applied to the database but missing from the local migrations directory"** → interpret by family: **dev family → ✅ expected** (a sibling's in-flight migration in the shared dev DB; reconciles on merge to `dev`) — name it so the user sees you understood, don't flag it as a problem. **staging/main → ⚠️ anomaly** (a migration in the DB that this branch doesn't have) — surface it.
- **Orphan-edit guard (any branch):** is `packages/db/prisma/schema.prisma` newer than the latest folder under `packages/db/prisma/migrations/`, or showing uncommitted edits, with no matching new `migration.sql`? If so → ⚠️ drift: schema edited without a migration authored. Detect by inspection; do not run `db:migrate:dev`.

## Step 5 — Output

```
CONFIRM — <branch> (<family> family)   ·   origin read live (git ls-remote)

Verdict: <✅ ALL CLEAR — you're right | ⚠️ ONE THING | ❌ NOT YET>

═══ Your claims, verified ═══
✅ Committed    tree clean · HEAD <sha> "<subject>" (<relative time>)
✅ Pushed       origin/<branch> @ <sha> = local HEAD
✅ Migrated     "Database schema is up to date" · no drift

═══ Migration detail ═══        (only when not a plain up-to-date)
- <verbatim prisma migrate status line>
- <family reading, e.g. "dev-1's migration sits in the shared dev DB — expected, reconciles on merge to dev">

═══ The one thing ═══           (only on ⚠️ / ❌)
<the single precise issue> → <exact command the USER runs>
```

- **✅ ALL CLEAR** → the three claim lines, nothing else. This is the common case; keep it short and unhedged.
- **⚠️ ONE THING / ❌ NOT YET** → keep the ✅ lines that passed, mark the one that didn't, and put the fix (a command the *user* runs) in "The one thing".
- Never print a migration "problem" for a dev-family sibling migration — that's a ✅ with a one-line explanation, not a warning.

## What this skill does NOT do

- Commit, push, merge, checkout, fetch, or deploy anything — it reads state and reports; the user does all of those.
- Run a migration (`db:migrate:dev` / `db:deploy` / `db:reset`) or execute `guard-prisma.js` — migration status is read-only; drift is judged by inspection. The user runs migrations.
- Edit code, schema, `.env`, or memory.
- Run the build/typecheck/lint/test gauntlet — that's `/check`.
- Audit the working diff for layer boundaries, dead code, or wire mismatches — that's `/dig`.
- Gate a promotion or list what `db:deploy` will apply to the next env — that's `/diff-merge`.
- Flag a dev-family sibling's shared-DB migration as drift — on the dev family that's expected.
- Trigger on anything but the literal `/session-confirm` invocation.
