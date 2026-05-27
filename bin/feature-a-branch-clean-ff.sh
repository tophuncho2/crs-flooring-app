#!/usr/bin/env bash
#
# Fast-forward a-branch into staging, then verify the tree from clean.
#
# Equivalent to running, from the staging worktree:
#   git fetch
#   git merge --ff-only a-branch
#   rm -rf apps/web/.next apps/web/tsconfig.tsbuildinfo
#   npm run build
#   npm run test
#   npm run lint
#
# Why "clean": stale build artifacts (.next, tsbuildinfo) and a stale generated
# Prisma client are a common source of confusing failures after a merge. The rm
# clears Next's cache + the incremental tsc info, and `npm run build` regenerates
# the Prisma client (db build = db:generate && tsc), so build/test/lint run
# against fresh output rather than whatever was lying around pre-merge.
#
# Fail-fast: any failing step (non-ff merge, build, test, lint) aborts the run —
# later steps don't execute. The step that failed is the last header printed.
#
# Scope: code only. This does NOT touch the database — run db:deploy / db:seed
# separately if the merge included a migration.
#
# Run from anywhere in the repo:  bash bin/feature-a-branch-clean-ff.sh

set -euo pipefail

MERGE_BRANCH="a-branch"
REQUIRED_BRANCH="staging"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

# Operate from the repo root so the relative rm paths and `npm run` resolve
# correctly no matter where this is invoked from. With worktrees this is the
# root of the *current* worktree (i.e. the staging checkout).
TOPLEVEL="$(git rev-parse --show-toplevel)"
cd "$TOPLEVEL"

# Merging a-branch only makes sense onto staging — guard against running this
# from the wrong worktree (e.g. a-branch's own checkout).
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "$REQUIRED_BRANCH" ]; then
  fail "current branch is '$current_branch', expected '$REQUIRED_BRANCH' — refusing to merge $MERGE_BRANCH here"
  exit 1
fi

header "Fetching latest refs from origin"
git fetch
ok "fetch complete"

header "Fast-forwarding $MERGE_BRANCH → $REQUIRED_BRANCH"
git merge --ff-only "$MERGE_BRANCH"
ok "$REQUIRED_BRANCH fast-forwarded to $MERGE_BRANCH"

header "Clearing build artifacts (.next, tsbuildinfo)"
rm -rf apps/web/.next apps/web/tsconfig.tsbuildinfo
ok "artifacts cleared"

header "Building"
npm run build
ok "build passed"

header "Testing"
npm run test
ok "tests passed"

header "Linting"
npm run lint
ok "lint passed"

printf "\n\033[1;32m═══ clean ff-merge + build + test + lint all passed ═══\033[0m\n"
