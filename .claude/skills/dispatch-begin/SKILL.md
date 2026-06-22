---
name: dispatch-begin
description: Open a dispatching session. Read-only recon that discovers the dev-N sub-branches dynamically (no hardcoded count) and reports how far ahead/behind each is relative to dev, plus per-worktree dirty state, so you know the lay of the land before splitting work with /dispatch. Mirrors the read-only guardrails of /promote and /dev-sync — never fetches, merges, pushes, or mutates anything. Explicit-only — invoke on /dispatch-begin.
---

# /dispatch-begin

`/dispatch-begin` is the session-opener for dispatching work across branches. Run it at the **start** of a session to declare "this is a dispatching session" and to take stock: it discovers every `dev-N` sub-branch, reports each one's commit distance from `dev` and whether its worktree is dirty, then points you at `/dispatch` to split the work.

It is pure **read-only recon** — the sync-state sibling of `/promote`. It inspects git and stops. It never fetches, merges, pushes, checks out, or writes anything.

## Repo layout (read this first)

Bare repo + worktrees, not a single checkout:

- `.bare/` — the git directory.
- `dev/`, `dev-1/`, `dev-2/`, … `dev-N/`, `staging/`, `main/` — one folder per branch, each its own worktree with its own `.env`.
- All worktrees share `.bare/`, so any worktree can resolve every branch's ref.
- `dev-1 … dev-N` are sub-branches off `dev`. The count is **variable** — discover it; never hardcode it.

## Hard rules

- **Read-only. Mutate nothing.** Allowed: `git for-each-ref`, `git rev-list`, `git rev-parse`, `git log`, `git status`, `git worktree list`, `git branch`. Forbidden: `git fetch`, `git merge`, `git push`, `git pull`, `git checkout`, any edit/commit. Mirror `/promote`'s read-only stance.
- **No fetch — refs are local.** Like `/promote`, you do not refresh from origin. Comparisons are against the **local** `dev` ref. Say so in the report.
- **Discover dev-N dynamically.** Enumerate branches from `refs/heads/dev-[0-9]+`; never assume the count (`dev-4`, `dev-5`, … must appear automatically).
- **Compare every branch to `dev`.** `dev` is the base all sub-branches fork from. Report behind-dev and ahead-of-dev counts per branch.
- **Recon only — don't dispatch.** This skill reports state and hands off to `/dispatch`. It does not read code, build a file-ownership map, or write briefs.
- **Explicit-only.** Trigger on the literal `/dispatch-begin`. Not on "start dispatching", "begin a dispatch session", "check the branches".

## Step 1 — Discover the dev-N branches

Enumerate the sub-branches dynamically (sorted naturally):

```
git for-each-ref --format='%(refname:short)' refs/heads/ | grep -E '^dev-[0-9]+$' | sort -V
```

Confirm `dev` itself exists as the base (`git rev-parse --verify dev`). Resolve worktree paths once:

```
git worktree list --porcelain
```

so each `dev-N` can be mapped to its folder.

## Step 2 — Measure each branch against dev

For each discovered `dev-N`, get its distance from the local `dev`:

```
git rev-list --left-right --count dev...dev-N
```

The output is `<behind>\t<ahead>` — left = commits on `dev` the branch lacks (**behind dev**), right = commits on the branch not yet on `dev` (**ahead of dev**). Also capture the branch tip subject (`git log -1 --format='%h %s' dev-N`) for context.

## Step 3 — Check each worktree's tree state

For each `dev-N` worktree path from Step 1:

```
git -C <worktree-path> status --porcelain
```

Empty = clean; non-empty = dirty (uncommitted work in flight on that branch). Note it — a dirty worktree means that branch already has live work, which `/dispatch` should route around.

## Step 4 — Report

```
═══ DISPATCH-BEGIN — branch sync vs dev ═══
Refs are LOCAL (no fetch). Base: dev @ <sha> "<subject>"

Branch  | Worktree   | Behind dev | Ahead of dev | Tree   | Tip
--------+------------+------------+--------------+--------+---------------------------
dev-1   | ../dev-1   | 0          | 0            | clean  | <h> <subject>
dev-2   | ../dev-2   | 3          | 1            | dirty  | <h> <subject>
dev-3   | ../dev-3   | 0          | 0            | clean  | <h> <subject>
dev-4   | ../dev-4   | 5          | 0            | clean  | <h> <subject>

TL;DR: <N> dev-N branches. <free / busy summary — which are clean & in sync vs ahead/behind/dirty>.
Next: /dispatch <the work> to split it across the free branches (no two touch the same file).
Notes: behind-dev branches catch up with /dev-sync (the user runs it); merges are the user's.
```

Flag, in the TL;DR, which branches are **clean and in sync with dev** (the safe targets for fresh dispatch) versus those **ahead of dev** (unpushed/unmerged work) or **dirty** (uncommitted work) that `/dispatch` should avoid handing new work to.

## What this skill does NOT do

- Fetch, merge, push, pull, checkout, or mutate anything — read-only, like `/promote`.
- Refresh refs from origin — comparisons are local; the report says so.
- Hardcode the dev-N count — it discovers them from `refs/heads/dev-[0-9]+`.
- Read code, build a file-ownership map, or write dispatch briefs — that's `/dispatch`.
- Run the sync/check/push cycle or resolve being behind dev — that's `/dev-sync` (user-run).
- Audit a staging → main promotion — that's `/promote`.
- Trigger on anything but the literal `/dispatch-begin` invocation.
