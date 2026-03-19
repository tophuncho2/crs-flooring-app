# Shared Variables Manager Strengths Vs Weaknesses

Last reviewed: 2026-03-19

## Strong Points

- [x] Shared route definitions already exist in `app/dashboard/flooring-navigation.ts`.
- [x] Tool access and catalog values are centralized in `server/platform/tool-subscriptions.ts`.
- [x] Work-order domain options and policy values are grouped in `features/flooring/work-orders/contracts.ts`.
- [x] Shared hotkeys are defined once in `server/flooring/hotkeys.ts`.
- [x] Table-control behavior has a reusable shared hook in `features/flooring/shared/use-table-controls.ts`.
- [x] Pagination helpers exist in `server/pagination.ts` instead of being rebuilt in routes.
- [x] Shared unit-measure include/normalize logic exists in `server/flooring/unit-measures.ts`.
- [x] Queue job names are extracted into dedicated server job files.
- [x] Several shared values use `as const`, improving type safety and reuse.

## Weak Points

- [ ] App metadata is still generic and hardcoded in `app/layout.tsx` rather than stored in a shared config source.
- [ ] Theme boot values are embedded inline in `app/layout.tsx`, making them harder to reuse or audit.
- [ ] Runtime env access is scattered across `server/storage/s3.ts`, `server/auth/auth-options.ts`, and `server/db/prisma.ts`.
- [ ] There is no typed env-validation module enforcing required variables at startup.
- [ ] Page-size defaults are duplicated by intent in `features/flooring/shared/use-table-controls.ts` and `server/pagination.ts`.
- [ ] Shared-variable conventions are flooring-heavy and not yet normalized across the full app.
- [ ] Some Prisma include/select shapes remain local constants near mutations instead of being grouped by domain contract.
- [ ] Shared style constants are minimal; layout/theming values are not yet organized into a dedicated system.
- [ ] There is no single source-of-truth index explaining ownership of shared variables by category.

## Priority Checklist

- [ ] Establish one canonical location for env variables and runtime config.
- [ ] Establish one canonical location for app shell constants:
  title, description, theme defaults, color-theme defaults.
- [ ] Deduplicate pagination and table default values where they represent the same business default.
- [ ] Standardize a folder convention for shared values:
  `app-shared`, `server-shared`, `feature-shared`, or equivalent.
- [ ] Audit page and client components for literals that should move into shared contracts.
- [ ] Decide which shared values are business rules vs UI presentation values.
- [ ] Add update discipline so this folder stays current when new shared-variable files are added.

## Current Overall Assessment

- Shared variables are in decent shape inside the flooring domain.
- Cross-app shared-variable governance is still early.
- The main gains now will come from centralizing env/config, app shell defaults, and duplicated default values.
