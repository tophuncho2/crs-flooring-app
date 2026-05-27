#!/usr/bin/env bash
#
# Sync staging into the branch worktrees: a-branch → b-branch → c-branch.
#
# For each branch, in its own worktree, this does the equivalent of:
#   git fetch && git merge origin/staging && git push
# so you don't have to repeat it three times by hand.
#
# Why worktrees (not checkout): a-branch/b-branch/c-branch are each checked
# out in their own worktree (see `git worktree list`), so they cannot be
# checked out here. We operate on each via `git -C <worktree-path>` instead,
# which leaves your current staging worktree untouched.
#
# Steps:
#   1. Fetch origin once (shared object store updates origin/staging for all)
#   2. For each branch, in order a → b → c:
#        - skip if its worktree has uncommitted changes
#        - merge origin/staging (--no-edit); on conflict, abort and record fail
#        - push origin <branch> on success
#   3. Print a per-branch summary
#
# Safety:
#   - set -euo pipefail
#   - merges are guarded so one conflict doesn't kill the whole run;
#     a conflicted merge is aborted to leave that worktree clean
#   - dirty worktrees are skipped, never stomped
#   - no force pushes, no resets
#   - exits non-zero if any branch failed or was skipped
#
# Run from anywhere:  bash bin/sync-branches.sh

set -euo pipefail

BRANCHES=(a-branch b-branch c-branch)
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

  if git -C "$path" merge --no-edit "$SOURCE_REF"; then
    ok "$branch merged"
  else
    fail "$branch merge hit conflicts — aborting merge, leaving worktree clean"
    git -C "$path" merge --abort
    RESULTS[$i]="FAILED (merge conflict)"
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
