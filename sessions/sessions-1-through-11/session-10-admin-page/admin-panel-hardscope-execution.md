# Execution Log — Admin Panel Removal

Plan: [admin-panel-hardscope-plan.md](admin-panel-hardscope-plan.md) — locked.

| Phase | Status |
|---|---|
| 1. Delete admin web UI surface | ✅ DONE |
| 2. Relocate set-password → packages/auth/ | ✅ DONE |
| 3. Delete remaining admin packages | ✅ DONE |
| 4. Trim access-control + auth-options + session | ✅ DONE |
| 5. Trim app-shell nav plumbing | ✅ DONE |
| 6. Engine `panel/` stale imports (scope amendment, see below) | ✅ DONE |
| 7. Verification gates | ✅ ALL GREEN |

Per CLAUDE.md: no commit run; ready for the user to commit when desired.

---

## Phase 1 — Delete admin web UI (DONE)

| Path | Action |
|---|---|
| `apps/web/modules/admin/` | DELETED (entire tree, ~13 files) |
| `apps/web/app/dashboard/admin/` | DELETED (3 pages: list, create, detail) |
| `apps/web/app/api/admin/` | DELETED (2 route files: `users/route.ts`, `users/[id]/route.ts`) |
| `apps/web/tests/server/auth/admin-users-routes.test.ts` | DELETED (no longer applicable) |

Auth-related tests (`admin-recovery.test.ts`, `set-password-route.test.ts`, `owner-recovery.test.ts`) **kept** — those scripts/routes survive.

## Phase 2 — Relocate set-password (DONE)

New `packages/db/src/auth/`:
- `read-repository.ts` — `findUserByEmail` + `UserAuthRecord`
- `write-repository.ts` — `setUserPassword`
- `index.ts` — re-exports

New `packages/application/src/auth/`:
- `errors.ts` — `AuthExecutionError` + `AuthErrorCode` (codes trimmed from 7 → 2: `AUTH_USER_NOT_FOUND`, `AUTH_PASSWORD_ALREADY_SET` — only ones used by the surviving flow)
- `set-user-password.ts` — `setUserPasswordUseCase` (verbatim logic, swapped error class + codes)
- `index.ts` — re-exports

Test updated: `apps/web/tests/server/auth/set-password-route.test.ts` — `GovernanceExecutionError` → `AuthExecutionError`, codes renamed to match.

`/api/auth/set-password/route.ts` route unchanged — `normalizePrismaError` is duck-typed on `.status`, picks up `AuthExecutionError` automatically.

## Phase 3 — Delete admin packages (DONE)

Deleted entirely:
- `packages/application/src/admin/` (8 files: 5 use cases + types + mappers + errors + index)
- `packages/db/src/admin/` (4 files: shared + read + write + index)
- `packages/domain/src/admin/` (4 files: types + governance-rules + mappers + index)

Package indexes updated:
- `packages/application/src/index.ts:2` — `./admin/index.js` → `./auth/index.js`
- `packages/db/src/index.ts:28` — `./admin/index.js` → `./auth/index.js`
- `packages/domain/src/index.ts` — `./admin/index.js` line removed (no domain auth helpers needed)

## Phase 4 — Trim access-control + auth-options + session (DONE)

`apps/web/server/auth/access-control.ts` rewritten — removed:
- Capabilities `governance.access`, `adminPanel.access`, `users.manage` (from `CAPABILITIES` tuple + role sets)
- Helpers `canAccessAdminPanel`, `canManageUsers`, `hasGovernanceAccess`, `canBypassVerification`

`apps/web/server/auth/auth-options.ts:113` — `canBypassVerification(...)` call replaced with plain `if (!user.isVerified)`. Import on line 5 trimmed accordingly.

`apps/web/server/auth/session.ts:42` — same swap.

`apps/web/server/auth/route-auth.ts` rewritten — kept only `authorizeRouteAccess` + `AuthorizedRouteContext` (the only consumed exports per audit). Deleted dead helpers: `ensureCapability`, `ensureToolAccess`, `ensureBuilderOrAdmin`, `ensureAuthenticated`, `ensureBuilderOnly`, `ensureAdminOnly`, `ensureGovernanceUser`, `ensureAdminPanelAccess`. (All confirmed orphans — only `authorizeRouteAccess` was consumed by `route-helpers.ts` + the test.)

Tests updated:
- `apps/web/tests/server/auth/access-control.test.ts` rewritten to test only the 3 surviving capabilities + 5 roles
- `apps/web/tests/server/auth/route-auth.test.ts:68` — `users.manage` → `system.access`

## Phase 5 — Trim app-shell nav plumbing (DONE)

| File | Change |
|---|---|
| `apps/web/modules/app-shell/components/header-controls.tsx` | Dropped `hasAdminPanelAccess` computation + prop pass-through |
| `apps/web/modules/app-shell/components/nav-drawer-button.tsx` | Dropped `hasAdminPanelAccess` prop; gate simplified to `!canUseTools` |
| `apps/web/modules/app-shell/hooks/use-navigation-state.ts` | Dropped `hasAdminPanelAccess` parameter + the `if (item.builderOnly) return hasAdminPanelAccess` branch |
| `apps/web/modules/app-shell/components/user-menu.tsx` | Dropped Admin Panel button (lines 96-106) + dead `hasAdminPanelAccess` local |
| `apps/web/modules/app-shell/navigation/definitions.ts` | Dropped `builderOnly?: boolean` field (unused — no items had it set) |

## Phase 6 — Engine `panel/` stale imports (scope amendment)

The locked plan called the 5 pre-existing engine `panel/` typecheck errors out-of-scope, but the same plan listed `npm run build` going green as a verification gate. After phases 1–5 cleared every other error, the build still failed only on those 5. User approved a scope amendment (Option A) to fix them as the smallest possible deviation.

| File | Old path | New path |
|---|---|---|
| `apps/web/modules/shared/engines/record-view/panel/record-multi-section-panel.tsx:3` | `../client/use-record-page-controller` | `../client/controllers/use-record-page-controller` |
| `apps/web/modules/shared/engines/record-view/panel/record-panel-config.ts:4` | `../client/record-detail-client-scaffold` | `../client/scaffolds/record-detail-client-scaffold` |
| `apps/web/modules/shared/engines/record-view/panel/record-panel-config.ts:5` | `../client/use-record-notices` | `../client/hooks/use-record-notices` |
| `apps/web/modules/shared/engines/record-view/panel/record-panel-renderer.tsx:4` | `../client/use-record-notices` | `../client/hooks/use-record-notices` |
| `apps/web/modules/shared/engines/record-view/panel/record-panel-renderer.tsx:5` | `../client/use-record-page-controller` | `../client/controllers/use-record-page-controller` |

Pure path renames — no semantic change. The modules had been moved into subdirs (`controllers/`, `scaffolds/`, `hooks/`) by an earlier reorg; the 3 `panel/` files were missed.

## Phase 7 — Verification gates (DONE — all green)

| Gate | Result |
|---|---|
| `npm run build --workspace @builders/domain` | ✅ exit 0 |
| `npm run build --workspace @builders/db` | ✅ exit 0 |
| `npm run build --workspace @builders/application` | ✅ exit 0 |
| `npm run typecheck --workspace @builders/web` | ✅ **exit 0 — zero errors** (was 9 errors at start of session) |
| `npm run build --workspace @builders/web` (Next.js) | ✅ **exit 0 — first time since WO sweep landed** |
| Residual grep across all admin/governance identifiers | ✅ 0 matches in `apps/` and `packages/` source (excluding `dist/`, `.next/`, `a-branch/`, `node_modules/`, and intentional `admin-recovery` script keepers) |
| Route map in build output | ✅ no `/dashboard/admin/*`, no `/api/admin/*` routes generated |

## Outcomes

- **9 → 0** TypeScript errors in `@builders/web`. The 4 admin errors and the 5 engine `panel/` errors that have been documented as out-of-scope on every recent sweep are all gone.
- **Next.js build green** for the first time since the work-orders sweep landed.
- Engine off-ramp progress: admin module's last 9 imports from `@/modules/shared/engines/list-view/*` and `@/modules/shared/engines/common/transport/*` retired by deletion. Engine consumer count drops accordingly.
- User can manage users from terminal via existing `db:upsert-owner` (creates verified owner with preset password) + `db:promote-admin` (flips an existing user to ADMIN). `/api/auth/set-password` route remains as a self-serve first-login password setter if ever wanted.

## Out of scope (tracked for future)

- Engine collapse (promoting `useSingleSectionRecordController`, scaffolds, panels out of `modules/shared/engines/` into `apps/web/{controllers,components}/`). Per WO precedent, that's a dedicated multi-module sweep.
- New top-level `apps/web/hooks/` directory — admin removal touched no hooks. Memory updated to seed the next engine-collapse sweep with that directory in mind.
