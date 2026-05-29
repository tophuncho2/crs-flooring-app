#!/usr/bin/env bash
#
# Sync staging into the staging-baby worktree.
#
# Fast-forwards staging-baby up to origin/staging and pushes — the equivalent of:
#   git fetch && git merge --ff-only origin/staging && git push
# run inside the staging-baby worktree.
#
# It is strictly a fast-forward tool: a branch that has diverged (carries its
# own commits staging doesn't have) is skipped, not merged, so you can rebase
# it onto staging yourself. No merge commits are ever created here.
#
# Why worktrees (not checkout): staging-baby is checked out in its own worktree
# (see `git worktree list`), so it cannot be checked out here. We operate on it
# via `git -C <worktree-path>` instead, which leaves your current staging
# worktree untouched.
#
# Steps:
#   1. Fetch origin once (updates origin/staging in the shared object store)
#   2. For staging-baby:
#        - skip if its worktree has uncommitted changes
#        - skip if it has commits staging doesn't have (rebase first)
#        - fast-forward to origin/staging (never a merge commit)
#        - push origin staging-baby on success
#   3. Print a result line
#
# Safety:
#   - set -euo pipefail
#   - fast-forward only: a diverged branch is skipped, never merged or stomped
#   - a dirty worktree is skipped, never stomped
#   - no force pushes, no resets
#   - exits non-zero if the branch failed or was skipped
#
# Run from anywhere:  bash bin/sync-branches.sh

set -euo pipefail

BRANCHES=(staging-baby)
SOURCE_REF="origin/staging"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn()   { printf "\033[1;33m! %s\033[0m\n" "$*" >&2; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

# Resolve the filesystem path of the worktree that has $1 checked out.
# Prints the path, or nothing if the branch is not checked out in any worktree.
worktree_path_for() {
  local branch="$1"
  # NB: a worktree path may contain spaces (e.g. ".../Code Projects/..."), so
  # take everything after the "worktree " prefix rather than the 2nd field.
  git worktree list --porcelain | awk -v ref="refs/heads/$branch" '
    /^worktree / { path = substr($0, 10) }
    $1 == "branch" && $2 == ref { print path; exit }
  '
}

# Results kept in an indexed array parallel to BRANCHES (works on bash 3.2,
# which macOS still ships — no associative arrays).
RESULTS=()

# 1. Fetch once.
header "Fetching latest refs from origin"
git fetch origin
ok "fetch complete"

# 2. Merge + push per branch.
for i in "${!BRANCHES[@]}"; do
  branch="${BRANCHES[$i]}"
  header "Syncing $SOURCE_REF → $branch"

  path="$(worktree_path_for "$branch")"
  if [ -z "$path" ]; then
    fail "$branch is not checked out in any worktree — skipping"
    RESULTS[$i]="SKIPPED (no worktree)"
    continue
  fi
  printf "  worktree: %s\n" "$path"

  if [ -n "$(git -C "$path" status --porcelain)" ]; then
    warn "$branch worktree has uncommitted changes — skipping (commit or stash first)"
    RESULTS[$i]="SKIPPED (dirty worktree)"
    continue
  fi

  # This script only fast-forwards a branch up to staging. If the branch has
  # its own commits that staging doesn't have, it has diverged — skip it so you
  # can rebase it onto staging by hand. A sub-branch must never carry a commit
  # staging lacks, and we never create a merge commit here.
  ahead="$(git -C "$path" rev-list --count "$SOURCE_REF..HEAD")"
  if [ "$ahead" -ne 0 ]; then
    warn "$branch has $ahead commit(s) staging doesn't have — skipping (rebase onto staging first)"
    RESULTS[$i]="SKIPPED (ahead of staging — rebase first)"
    continue
  fi

  if git -C "$path" merge --ff-only "$SOURCE_REF"; then
    ok "$branch fast-forwarded to staging"
  else
    fail "$branch could not fast-forward — skipping"
    RESULTS[$i]="FAILED (not fast-forward)"
    continue
  fi

  if git -C "$path" push origin "$branch"; then
    ok "$branch pushed"
    RESULTS[$i]="OK"
  else
    fail "$branch push failed"
    RESULTS[$i]="FAILED (push)"
  fi
done

# 3. Summary.
header "Summary"
exit_code=0
for i in "${!BRANCHES[@]}"; do
  branch="${BRANCHES[$i]}"
  status="${RESULTS[$i]:-UNKNOWN}"
  if [ "$status" = "OK" ]; then
    ok "$branch — $status"
  else
    fail "$branch — $status"
    exit_code=1
  fi
done

if [ "$exit_code" -eq 0 ]; then
  printf "\n\033[1;32m═══ all branches synced ═══\033[0m\n"
else
  printf "\n\033[1;31m═══ finished with issues — see above ═══\033[0m\n"
fi

exit "$exit_code"
