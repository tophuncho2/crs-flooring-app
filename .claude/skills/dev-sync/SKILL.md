---
name: dev-sync
description: Bring the current worktree up to dev and verify it in one pass — fetch origin, merge origin/dev, run the check gauntlet, then push only if green. Scoped to the dev-N sub-branches (dev-1, dev-2, …) and staging; refuses dev and main. Drives bin/dev-sync.sh and reports the outcome. Explicit-only — invoke on /dev-sync.
---

# /dev-sync

`/dev-sync` runs the cross-worktree sync cycle for the current branch: **fetch origin → merge `origin/dev` → `bin/check.sh` → push** (push only if the checks pass). It is the sibling of `/check` — where `/check` just verifies, `/dev-sync` catches the worktree up to `dev`, verifies, and publishes. The script of record is `bin/dev-sync.sh` (also `npm run dev-sync`); this skill drives it and interprets the result.

Reach for it when a `dev-N` worktree has fallen behind `dev` and you want it current, checked, and pushed in one command.

## Hard rules

- **dev-N + staging only.** Runs on the `dev-N` sub-branches (`dev-1`, `dev-2`, … — matched by `^dev-[0-9]+$`, so future `dev-4/5` are covered) and on `staging` (dev → staging is a clean fast-forward ~99% of the time). On `dev`, push directly; on `main`, use `/promote`. The script enforces this guard — never bypass it.
- **Check before push.** The gauntlet runs *before* the push, so a broken merge never reaches origin. Never reorder to push first.
- **No auto-fix.** On a merge conflict or a failed check, report the cause and the recovery command, then stop. Do not resolve conflicts, edit code, or amend tests to make it pass.
- **Do not commit user work.** The only commit `/dev-sync` produces is git's own merge commit. Never `git add`/`git commit` the user's changes — a dirty tree aborts the sync by design.
- **Explicit-only.** Trigger on the literal `/dev-sync`. Not on "sync it", "catch up dev", "pull and check".

## Step 1 — Run the sync

From the current worktree root, run the script and let it stream:

```
bash bin/dev-sync.sh
```

(`npm run dev-sync` is equivalent.) The script runs six steps in order — branch guard, clean-tree guard, `git fetch origin`, `git merge --no-edit origin/dev`, `bash bin/check.sh`, `git push` — and aborts at the first failure, pushing nothing.

## Step 2 — Interpret and report

Read the script's exit and its `═══ sync summary ═══` table, and classify the outcome:

- **guard-abort** — not on a `dev-N` branch or `staging`. Report the branch and point to the right tool (`dev` → push directly, `main` → `/promote`).
- **dirty-tree abort** — uncommitted changes. Tell the user to commit or stash, then re-run.
- **conflict-abort** — `origin/dev` conflicts with the branch. The merge was aborted and the tree restored; the user resolves manually before re-running.
- **check-fail** — the merge landed locally but checks failed, so nothing was pushed. Surface the failing gauntlet step and the recovery line: fix and re-run, or `git reset --hard origin/<branch>` to unwind.
- **synced** — merged, checked, pushed; `origin/<branch>` advanced.

## Output block

```
═══ dev-sync — <branch> ═══
guard   ✅ / ❌   <branch eligible? else why>
clean   ✅ / ❌   <tree clean? else dirty>
fetch   ✅ / ❌
merge   ✅ / ❌   <caught up to dev / conflict — aborted>
check   ✅ / ❌   <build+typecheck+lint+test / which step failed>
push    ✅ / ❌   <origin/<branch> advanced / not pushed>

TL;DR: <synced and pushed | aborted at <step> — nothing pushed>
Recovery (on abort): <the exact command to run next>
```

## What this skill does NOT do

- Does not run on `dev` (push directly) or `main` (→ `/promote`); the guard refuses both.
- Does not resolve merge conflicts or edit code to make checks pass — it reports and stops.
- Does not commit or stash the user's working changes; a dirty tree aborts by design.
- Does not run migrations (the user runs those), and is not a promotion tool (→ `/promote`).
- Is not the build gauntlet itself — that's `/check` / `bin/check.sh`, which `/dev-sync` invokes as one step.
- Does not trigger on anything but the literal `/dev-sync`.
