---
name: check-gauntlet
description: Run the full local build gauntlet — clean caches, then build, typecheck, lint, test — and report a structured PASS/FAIL table with error counts and a TL;DR. Use on /check-gauntlet, or when the user asks to "run the checks", "run the gauntlet", "clean and rebuild", or verify the tree compiles/lints/tests/builds before committing or promoting.
---

# /check-gauntlet

Run the project's local verification gauntlet and report results in one pass. This is the sequence the user runs by hand before committing or promoting:

```
rm -rf apps/web/.next apps/web/tsconfig.tsbuildinfo
npm run build
npm run typecheck
npm run lint
npm run test
```

**Build runs first, before typecheck/test.** `@builders/web`/`relay`/`worker` resolve shared packages (`@builders/domain`, `@builders/db`, …) to their compiled `dist/`, and the build regenerates those dists plus the Prisma client (`db` build = `db:generate && tsc`). If typecheck or test ran first against a stale `dist/`, a perfectly healthy source change would show as phantom "not exported" / "is not a function" failures. Building first means typecheck and test reflect true code health in one pass.

## Rules

- **Run all four checks even if an earlier one fails.** The user wants the full picture in one pass, not a fail-fast trickle. Capture each step's result and keep going.
- **Read-only intent.** This skill verifies; it does not fix. If a step fails, report the root cause and ask before changing code or tests. Never auto-edit to make a check pass.
- **Report in the chat per CLAUDE.md:** a results table (step → ✅/❌ → error/warning counts) plus a one-line TL;DR. Put any failure's root cause and any open question in the response.
- These commands are long-running. Use a generous timeout (`timeout: 600000`) and `tail` the output so the report stays focused on headlines and errors.

## Step 1 — Clean

Run:

```
rm -rf apps/web/.next apps/web/tsconfig.tsbuildinfo
```

## Step 2 — Run the four checks

Run **build first**, then the rest. Run each separately (not chained with `&&`) so a failure in one still lets the others run. Tail each so the transcript stays readable:

- `npm run build 2>&1 | tail -45`
- `npm run typecheck 2>&1 | tail -40`
- `npm run lint 2>&1 | tail -40`
- `npm run test 2>&1 | tail -50`

Note for interpreting results:
- **build** runs first; it compiles web, relay, and worker and regenerates the shared package `dist/`s + Prisma client that typecheck and test resolve against. If build fails, still run the other three, but call out that their results may reflect the stale pre-build artifacts.
- **lint** passes with warnings — the gate is `0 errors`. Report the warning count but don't treat warnings as failure.
- **test** runs workspaces sequentially (`@builders/domain` → `application` → `web` → `relay` → `worker`) and the umbrella script aborts at the first failing workspace, so a later workspace may be untested. Note that in the report.

## Step 3 — Report

Output a table like:

| Step | Result | Notes |
|------|--------|-------|
| clean | ✅ | caches removed |
| build | ✅/❌ | web + relay + worker |
| typecheck | ✅/❌ | N package(s), errors if any |
| lint | ✅/❌ | 0 errors, N warnings |
| test | ✅/❌ | X failed / Y passed; note if a workspace was skipped |

Then a one-line TL;DR, and — if anything failed — the root cause and an explicit open question on whether to fix it.
