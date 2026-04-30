# Plan — Admin Panel Removal (LOCKED 2026-04-29)

> **Status:** LOCKED. Execution log lives at [admin-panel-hardscope-execution.md](admin-panel-hardscope-execution.md).
>
> **Scope flipped from "fix and migrate" to "remove entirely"** during plan iteration — user direction: terminal-only user creation via existing `db:upsert-owner` + `db:promote-admin` scripts is sufficient; admin web UI never re-introduced.
>
> Earlier "migrate off engine" body retained below as historical context, but the live scope is the removal section that follows it.

---

## Locked decisions (final)

| # | Decision |
|---|---|
| 1 | **Delete admin web UI + dashboard pages + API routes + nav button + admin test files** in their entirety. |
| 2 | **Relocate** `setUserPasswordUseCase` + `findUserByEmail` + `setUserPassword` (the only live consumers of `packages/{application,db}/src/admin/`) into new `packages/{application,db}/src/auth/` directories. **Delete the rest of the admin packages.** Domain admin/ goes entirely. |
| 3 | **No new CLI script.** `db:upsert-owner` + `db:promote-admin` cover the user's needs. `setUserPasswordUseCase` + `/api/auth/set-password` flow stays alive in case terminal-created users need to set their own first-login password. |
| 4 | **No schema migration.** `User.updatedAt` is moot once admin record-view is gone. |
| 5 | **No `apps/web/hooks/` directory created in this sweep.** Admin removal touches no hooks. Project memory updated to seed the next engine-collapse sweep with that directory in mind. |
| 6 | **`hasAdminPanelAccess` plumbing across the app shell is removed.** `builderOnly` nav-item flag is also pruned (no current consumers). `canBypassVerification` is removed — terminal upserts already set `isVerified=true`, so the bypass is dead. |

## Removal surface (locked)

| Surface | Action |
|---|---|
| `apps/web/modules/admin/` (13 files) | DELETE entire tree |
| `apps/web/app/dashboard/admin/` (3 pages) | DELETE entire tree |
| `apps/web/app/api/admin/` (2 route files) | DELETE entire tree |
| `apps/web/tests/server/auth/admin-users-routes.test.ts` | DELETE |
| `apps/web/modules/app-shell/components/user-menu.tsx` Admin Panel button + `hasAdminPanelAccess` flag | REMOVE |
| `apps/web/modules/app-shell/components/header-controls.tsx` `hasAdminPanelAccess` computation + prop | REMOVE |
| `apps/web/modules/app-shell/components/nav-drawer-button.tsx` `hasAdminPanelAccess` prop + gate | REMOVE |
| `apps/web/modules/app-shell/hooks/use-navigation-state.ts` `hasAdminPanelAccess` parameter + `builderOnly` branch | REMOVE |
| `apps/web/modules/app-shell/navigation/definitions.ts` `builderOnly?: boolean` field on `FlooringNavItem` | REMOVE (no current consumers) |
| `apps/web/server/auth/access-control.ts` capabilities `governance.access`, `adminPanel.access`, `users.manage` | REMOVE from CAPABILITIES tuple + role sets |
| `apps/web/server/auth/access-control.ts` helpers `canAccessAdminPanel`, `canManageUsers`, `hasGovernanceAccess`, `canBypassVerification` | DELETE |
| `apps/web/server/auth/auth-options.ts` `canBypassVerification` call (line 113) | REPLACE with plain `if (!user.isVerified)` |
| `apps/web/server/auth/session.ts` `canBypassVerification` call (line 42) | REPLACE with plain `if (!user.isVerified)` |
| `packages/application/src/admin/{set-user-password,errors}.ts` | RELOCATE → `packages/application/src/auth/` (rename `GovernanceExecutionError` → `AuthExecutionError`; trim error codes to the 2 actually used: `USER_NOT_FOUND`, `PASSWORD_ALREADY_SET`) |
| `packages/application/src/admin/{create,update,delete,get,list}-managed-user.ts`, `mappers.ts`, `types.ts`, `index.ts` | DELETE |
| `packages/db/src/admin/{read-repository.ts portion: findUserByEmail, write-repository.ts portion: setUserPassword}` | RELOCATE → `packages/db/src/auth/` |
| `packages/db/src/admin/{shared.ts: managedUserSelect/normalizeManagedUserRow/ManagedUserRecord, read-repository.ts: findManagedUsers/findManagedUserById, write-repository.ts: createManagedUser/updateManagedUser/deleteManagedUser, index.ts}` | DELETE |
| `packages/domain/src/admin/{governance-rules,mappers,types,index}.ts` | DELETE entire directory |
| `packages/{application,db,domain}/src/index.ts` | UPDATE — drop `./admin/index.js` re-exports; add `./auth/index.js` re-exports for application + db |
| `apps/web/tests/server/auth/set-password-route.test.ts` | UPDATE — `GovernanceExecutionError` import → `AuthExecutionError` |
| `apps/web/tests/server/auth/admin-recovery.test.ts` | KEEP unchanged (script stays) |

## Verification gates

| Gate | Expected |
|---|---|
| `npm run build --workspace @builders/domain` | exit 0 |
| `npm run build --workspace @builders/db` | exit 0 |
| `npm run build --workspace @builders/application` | exit 0 |
| `npm run typecheck --workspace @builders/web` | **5 errors** — only pre-existing engine `panel/` leftovers. `app/api/admin` and `modules/admin` buckets disappear. |
| `npm run build --workspace @builders/web` (Next.js) | exit 0 — first time since WO sweep |
| `grep -rn "@/modules/admin\|/dashboard/admin\|/api/admin\|hasAdminPanelAccess\|canAccessAdminPanel\|canManageUsers\|hasGovernanceAccess\|canBypassVerification\|GovernanceExecutionError\|ManagedUserWithPermissions\|@builders/application/admin\|@builders/db/admin\|@builders/domain/admin" apps packages --include="*.ts" --include="*.tsx"` (excluding `dist/`, `.next/`, `node_modules/`) | 0 matches |

## Out of scope

| Item | Why |
|---|---|
| New `db:upsert-user` script | Existing `db:upsert-owner` + `db:promote-admin` cover the user's needs per stated direction |
| Renaming `db:promote-admin` → something more general | Script keeps working; cosmetic rename can wait |
| Creating `apps/web/hooks/` directory | Admin removal touches no hooks. Future engine-collapse sweep will land it. |
| Engine `panel/` `../client/...` import errors (5 pre-existing leftovers) | Pre-existing engine internals, unrelated. Engine-cleanup sweep. |

---

## Historical scope (pre-amendment) — kept for context only

> The plan body below was drafted under the original "fix TS errors + migrate off engine" scope. Superseded by the removal scope above. Kept for record-keeping and so the execution log can reference what was originally proposed.

## Context

The admin module (`apps/web/modules/admin/`) is the last consumer of two engine clusters that the work-orders sweep just abandoned: `shared/engines/list-view/*` (table + scaffold + grouping engine) and `shared/engines/common/transport/*` (the legacy mutation transport). It also hosts the 4 pre-existing TS errors that have been quoted as "out of scope" by every recent sweep — they block `npm run build`.

This sweep does both jobs in one pass:
1. **Fix the 4 TS errors** (root-cause through schema/data/api).
2. **Migrate the admin panel off the engine** onto the canonical `apps/web/{components,controllers,transport,query-policies}/` primitives, mirroring work-orders.

Schema commit (User.updatedAt) is alone per CLAUDE.md. Everything else can bundle.

---

## Bug surface map

| # | TS Error | File:line | Root cause | Fix layer |
|---|---|---|---|---|
| 1 | `'SessionUser' is not assignable to '{ id; role: GovernableRole }'` (×3 — GET/PATCH/DELETE) | `app/api/admin/users/[id]/route.ts:51, 95, 149` | `SessionUser.role: Role` enum is wider than `GovernableRole` (Role includes CONTRACTOR + CUSTOMER which aren't governable). The peer route `app/api/admin/users/route.ts:38, 78` already projects via `as GovernableRole`. This file forgot. | API route — narrow at boundary |
| 2 | `Type 'ManagedUserWithPermissions' does not satisfy 'BaseRecord' — Property 'updatedAt' is missing` | `modules/admin/controller/use-admin-user-primary-controller.ts:15` | `User` Prisma model has `createdAt` but **no `updatedAt`**. `ManagedUserRecord` therefore can't supply the optimistic-lock surrogate the engine's `useSingleSectionRecordController<TRecord extends BaseRecord, …>` requires. Workaround in current code: `delete` route uses `record.createdAt` as the revision key (line 42) — meaning the optimistic lock doesn't actually lock anything. | Schema → Data → Application → UI |

**TL;DR — 4 TS errors, 2 distinct root causes. Both shipping fixes also retire engine consumers along the way.**

## Engine off-ramp surface

Grep matrix on admin → `@/modules/shared/engines/*`:

| File | Engine clusters imported |
|---|---|
| `components/list/admin-users-client.tsx` | `engines/list-view/*` (5 imports), `engines/common/{display,feedback,record-entry}` (4 imports) |
| `components/list/admin-users-table.tsx` | `engines/list-view/table/*` + `controllers/use-table-controls` (5 imports) |
| `components/record/admin-user-detail-client.tsx` | `engines/record-view` (scaffold + context — **kept per WO precedent**) |
| `components/record/admin-user-record-panel.tsx` | `engines/record-view` (single-section panel + context — **kept**) |
| `components/record/admin-user-primary-fields-section.tsx` | `engines/record-view` (`RecordFormField`, `RECORD_FIELD_CONTROL_CLASS_NAME`, `RecordPrimaryPane`, …) — **needs migration** |
| `components/record/admin-user-create-client.tsx` | `engines/record-view` (scaffold + create controller — **scaffold kept; field primitives need migration**) + `engines/common/{transport,record-entry}` |
| `controller/types.ts`, `controller/use-admin-user-primary-controller.ts` | `engines/common/transport/*` (legacy `requestJson`, `withMutationMeta`) — **needs swap to `@/transport/*`** |
| `controller/use-admin-users-list-controller.ts` | `engines/record-view/client/hooks/use-record-notices` — **needs replacement** |
| `app/dashboard/admin/users/[id]/page.tsx` + `new/page.tsx` | `engines/common/record-entry` (`resolveRecordEntryReturnTo`) — **stays for now (used identically by WO pages)** |

After this sweep, admin imports from engines collapse to: scaffolds + `useSingleSectionRecordController` + `useSingleSectionCreateController` + `RecordSingleSectionPanel` + `RecordDetailClientScaffoldContext` (type) + `record-entry` (back-href helper). Identical to what WO kept.

---

## Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Add `updatedAt` to `User` Prisma model** with `@updatedAt @default(now())`. Schema commit alone. | Fix root cause of error #2; also gives admin row a real optimistic-lock surrogate (today the DELETE route lies — uses `createdAt`). |
| 2 | **Match work-orders precedent for "off engine"** — keep `useSingleSectionRecordController`, `useSingleSectionCreateController`, `RecordDetailClientScaffold`, `RecordCreateClientScaffold`, `RecordSingleSectionPanel`, `RecordDetailClientScaffoldContext` (type), and `record-entry` helpers. Migrate everything else (list-view engine, transport, common/feedback notices, common/display class names, primary-field primitives) off. | Promoting `useSingleSectionRecordController` itself out of `shared/engines` forces imports + WO + properties + templates to migrate too — explicitly out of WO sweep's scope ([work-orders-ui-migration-plan.md §"Out of scope"](session-9-work-orders/work-orders-ui-migration-plan.md)). Consistency wins. |
| 3 | **Add `validateCreateManagedUserInput` + `validateUpdateManagedUserInput` to `app/api/admin/_validators.ts`** (new file). Move validators out of route handlers per `apps/web/app/CLAUDE.md` rule #4 + the property-validator pattern just hardened. Cover `instructions`-style drop-on-the-floor by hand. | Today validators are inlined per route file, so ad-hoc. Centralized validator file means one audit surface; matches every other module (properties/work-orders/templates/imports). |
| 4 | **Canonicalize route shape**: split `app/api/admin/users/[id]/route.ts` (currently GET + PATCH + DELETE) into `[id]/route.ts` (GET + DELETE) and `[id]/primary/section/route.ts` (PATCH). | Per `apps/web/modules/CLAUDE.md` "Routing is sectional: each section on the record view gets its own route file" + matches WO/properties/templates. PATCH is a section save. |
| 5 | **`SessionUser → GovernanceActor` narrowing helper** at `apps/web/server/auth/governance-actor.ts`. Both routes import from there. | Eliminates ad-hoc `as GovernableRole` casts; runtime narrow throws if a non-governable role somehow reaches the route (defense-in-depth — today `users.manage` capability gates to OWNER/ADMIN, but the type system can't see that). |
| 6 | **List view migrates to `useServerListController` (fetch mode)** with a new client `listManagedUsersRequest` and a list-API surface that returns `ListOutput<ManagedUserWithPermissions>`. Mirrors WO + imports. | Drops `useListViewEngine`, `DashboardListPageScaffold`, `DashboardListPageTable`, `DashboardListPageControls`, `useTableControls`, `renderDashboardRowCells`, `renderGroupedTableRows`, `ClickableTableRow` — all engine-coupled. |
| 7 | **Primary fields move to `@/components/{cells,fields,layout-grid}` primitives.** `RecordFormField` → `FormField`. `RecordPrimaryPane` → `LayoutGrid + CellAt`. `RECORD_FIELD_CONTROL_CLASS_NAME + <select>/<input>` → `SelectCell`, `TextCell`, `StatusBadge`. `RecordStaticFieldValue` → `StaticFieldValue` (already in `@/components/fields`). | Same pattern WO primary section just adopted. |

---

## Layer-by-layer changes

### Schema (commit alone, per CLAUDE.md)

| File | Change |
|---|---|
| `packages/db/prisma/schema.prisma` | `model User` — add `updatedAt DateTime @updatedAt @default(now())`. The `@updatedAt` directive is required (Prisma auto-touches on every write); `@default(now())` backfills existing rows on `ALTER TABLE`. |
| `packages/db/prisma/migrations/{ts}_add_user_updated_at/migration.sql` (NEW) | `ALTER TABLE "user" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;` |

**Apply:** `npm run db:deploy` against Railway staging via root `.env`. Then `npm run db:generate`.

### Domain (no schema-shape changes)

| File | Change |
|---|---|
| `packages/domain/src/admin/types.ts` | No change needed — `GovernanceActor`/`GovernanceTarget`/`GovernablePermissions` shapes unchanged. |
| `packages/domain/src/admin/governance-rules.ts` | No change — predicates already operate on `GovernableRole` only. |

### Data

| File | Change |
|---|---|
| `packages/db/src/admin/shared.ts` | `ManagedUserRecord` adds `updatedAt: string`. `managedUserSelect` adds `updatedAt: true`. `normalizeManagedUserRow` projects `updatedAt: user.updatedAt.toISOString()`. |
| `packages/db/src/admin/read-repository.ts` | No structural change — already selects via `managedUserSelect`. Add a `getManagedUserByIdOrThrow` (uses `findUniqueOrThrow`) so the API route can pre-load the snapshot for `assertExpectedUpdatedAt` (matches WO's `getWorkOrderById` shape). |
| `packages/db/src/admin/write-repository.ts` | No change — Prisma auto-stamps `updatedAt` on `update`. |

### Application

| File | Change |
|---|---|
| `packages/application/src/admin/types.ts` | No change — `ManagedUserWithPermissions = ManagedUserRecord & GovernancePermissions` automatically inherits the widened `ManagedUserRecord`. |
| `packages/application/src/admin/{create,update,delete,get,list}-managed-user.ts` | No structural change. Use case signatures unchanged. |

### API

| File | Change |
|---|---|
| `apps/web/app/api/admin/_validators.ts` (NEW) | `validateCreateManagedUserInput(body): { email; role }` (replaces inline `validateCreateUserInput`). `validateUpdateManagedUserInput(body): UpdateManagedUserInput` (replaces inline). Throw `createAppError`. Per `apps/web/app/CLAUDE.md` + the property-validator audit pattern — every field that exists on the form **must** be projected. |
| `apps/web/server/auth/governance-actor.ts` (NEW) | `toGovernanceActor(user: SessionUser): { id; role: GovernableRole }` — narrows the role with a runtime check that throws `createAppError("Role X is not governable", 403)` if `user.role` falls outside the 3 governable roles. Defense-in-depth alongside the `users.manage` capability gate. |
| `apps/web/app/api/admin/users/route.ts` | Import validators from `_validators.ts`. Project actor via `toGovernanceActor(access.user)` (replaces inline `as GovernableRole` casts at lines 38 + 78). |
| `apps/web/app/api/admin/users/[id]/route.ts` | Reduce to GET + DELETE. Both use `toGovernanceActor(access.user)`. DELETE adds `assertExpectedUpdatedAt` (currently missing — pre-load via `getManagedUserByIdOrThrow`). |
| `apps/web/app/api/admin/users/[id]/primary/section/route.ts` (NEW) | PATCH only. Pre-load via `getManagedUserByIdOrThrow`, run `assertExpectedUpdatedAt`, then `updateManagedUserUseCase(id, input, toGovernanceActor(access.user))`. Mirrors `app/api/work-orders/[id]/primary/section/route.ts`. |

### Module dir (`apps/web/modules/admin/`)

Wipe (10 files) + recreate on the canonical 3-folder shape per `apps/web/modules/CLAUDE.md`. Folder rename `controller/ → controllers/` (plural per CLAUDE.md "Going forward the plural is canonical").

```
apps/web/modules/admin/
├── components/
│   ├── list/
│   │   ├── admin-users-client.tsx
│   │   └── admin-users-table.tsx
│   └── record/
│       ├── admin-user-detail-client.tsx
│       ├── admin-user-create-client.tsx
│       ├── admin-user-record-panel.tsx
│       └── primary/
│           └── admin-user-primary-fields-section.tsx
├── controllers/
│   ├── drafts.ts
│   ├── use-admin-users-list-controller.ts
│   ├── use-admin-users-list-mutations.ts
│   └── use-admin-user-primary-section.ts
└── data/
    ├── queries.ts
    ├── mutations.ts
    └── list-managed-users-request.ts
```

| File | Purpose |
|---|---|
| `data/queries.ts` | Keep `getAdminUsersPageData` + `getAdminUserDetailPageData`. Internal `toActor` helper inlined here (already exists). No engine imports. |
| `data/mutations.ts` (NEW) | `createManagedUserRequest`, `updateManagedUserRequest({id, input, revisionKey})`, `deleteManagedUserRequest({id, updatedAt})`. All wrap `withMutationMeta` from `@/transport/mutation`, call `requestJson` from `@/transport/http`. Mirrors `apps/web/modules/work-orders/data/mutations.ts`. |
| `data/list-managed-users-request.ts` (NEW) | `MANAGED_USERS_LIST_QUERY_KEY`, `parseManagedUsersListInputFromSearchParams`, `listManagedUsersRequest`. Mirrors WO. Note: list endpoint is currently SSR-only — to keep `useServerListController` happy in fetch mode we either (a) re-fetch via `/api/admin/users` GET on each query change or (b) return SSR rows once and refetch only on mutation invalidation. Choose **(a) — fetch mode, /api/admin/users GET as the source** to match WO. |
| `controllers/drafts.ts` (NEW) | `ManagedUserForm`, `EMPTY_MANAGED_USER_FORM`, `toManagedUserForm`, `validateCreateManagedUserForm`, `validateUpdateManagedUserForm`. Replaces `controller/types.ts`. |
| `controllers/use-admin-users-list-controller.ts` | Replace `useState`+`useRecordNotices` with `useRecordEntryNavigation` (kept) + `useAdminUsersListMutations` bundle for create/delete. Tiny — mirrors `use-work-orders-list-controller.ts`. |
| `controllers/use-admin-users-list-mutations.ts` (NEW) | react-query `useMutation`s for create + delete that invalidate `MANAGED_USERS_LIST_QUERY_KEY`. |
| `controllers/use-admin-user-primary-section.ts` | Wraps `useSingleSectionRecordController<ManagedUserWithPermissions, ManagedUserForm>` (now valid because `updatedAt` is on the type). Calls `updateManagedUserRequest`. `deleteRecord` calls `deleteManagedUserRequest({id, updatedAt: record.updatedAt})` — **no longer `record.createdAt`**. |
| `components/list/admin-users-client.tsx` | Drop `DashboardListPageScaffold`/`DashboardListPageControls`/`TablePaginationControls` — replace with `SectionHeader` + `SearchControl` + `SortToggle` + paginated `AdminUsersTable`. Sort field: `email`. Allowed sort fields: `["email", "role", "createdAt"]` (matches list-view groupable + sortable columns from current code). |
| `components/list/admin-users-table.tsx` | Drop `DashboardListPageTable`/`DashboardListRowCell`/`renderDashboardRowCells`/`renderGroupedTableRows`/`ClickableTableRow`. Replace with `Grid` from `@/components/grid` (4 columns: email, role, status badge, createdAt). Click row → navigate. Empty state via `<GridEmpty>`. |
| `components/record/admin-user-detail-client.tsx` | Keep — only imports `RecordDetailClientScaffold` + `RecordDetailClientScaffoldContext`. Both engine-stay items per locked decision #2. |
| `components/record/admin-user-record-panel.tsx` | Keep — uses `RecordSingleSectionPanel` + `useAdminUserPrimarySection`. Engine-stay items. |
| `components/record/primary/admin-user-primary-fields-section.tsx` | Migrate. `RecordPrimarySection` + `RecordPrimaryPane` → `LayoutGrid` from `@/components/layout-grid`. `RecordPrimaryFieldCell` → `CellAt`. `RecordFormField` → `FormField` from `@/components/fields`. `RecordStaticFieldValue` → `StaticFieldValue` from `@/components/fields`. The `<select>` for role + `<RECORD_FIELD_CONTROL_CLASS_NAME>` → `SelectCell` with `placeholder` from `@/components/cells`. Status pill → `StatusBadge` from `@/components/badges`. |
| `components/record/admin-user-create-client.tsx` | Keep `RecordCreateClientScaffold` + `useSingleSectionCreateController` (engine-stay). Field primitives migrate to `@/components/{cells,fields,layout-grid}`. Transport imports flip to `@/transport/{http,mutation}`. |

### Dashboard pages

| File | Change |
|---|---|
| `app/dashboard/admin/users/page.tsx` | Update import path `@/modules/admin/components/list/admin-users-client` (path unchanged since the module dir keeps its component names). Drop `getResolvedUserTablePreference` + `parseServerTableQueryState` — mirror WO's simpler shape: pass `initialSearchQuery` + `initialIsAscendingSort` + `initialPage` only. Table preferences out of scope (currently used; re-introduce later if needed). |
| `app/dashboard/admin/users/[id]/page.tsx` | No change — still imports `AdminUserDetailClient` + `getAdminUserDetailPageData` + `resolveRecordEntryReturnTo` (engine-stay). |
| `app/dashboard/admin/users/new/page.tsx` | No change — same engine-stay imports. |

---

## Verification

| Gate | Command | Expected |
|---|---|---|
| Schema migration applied | `npx prisma migrate status` | "Database schema is up to date!" |
| DB build | `npm run build --workspace @builders/db` | exit 0 |
| Domain build | `npm run build --workspace @builders/domain` | exit 0 |
| Application build | `npm run build --workspace @builders/application` | exit 0 |
| Admin API typecheck | `npm run typecheck --workspace @builders/web 2>&1 \| grep -E "^app/api/admin"` | 0 lines |
| Admin module typecheck | `npm run typecheck --workspace @builders/web 2>&1 \| grep -E "^modules/admin"` | 0 lines |
| Engine grep — admin | `grep -rn "@/modules/shared/engines" apps/web/modules/admin` | only `record-view` (scaffolds + section controller + panel + context type) |
| List-view engine grep — admin | `grep -rn "@/modules/shared/engines/list-view" apps/web/modules/admin apps/web/app/dashboard/admin` | 0 matches |
| Web typecheck overall | `npm run typecheck --workspace @builders/web 2>&1 \| awk -F'/' '{print $1"/"$2}' \| sort \| uniq -c` | Only `modules/shared` (5) — the 9 pre-existing leftovers drop to 5. **`app/api/admin` and `modules/admin` buckets disappear entirely.** |
| Web build (Next.js) | `npm run build --workspace @builders/web` | exit 0 — **this is the gate that has been blocked since the WO sweep.** |
| Manual smoke | `npm run dev` → `/dashboard/admin/users` | (1) List renders with email/role/status/createdAt columns. (2) Search + sort round-trip via the URL. (3) Click row → detail. (4) Edit role → save → toast → row reflects new role. (5) Delete user → row removed from list. (6) Create user from list → 201 → redirect to detail. |

---

## Sequencing

To minimize partial-broken-state windows:

1. **Schema commit alone** — `7a` style. Apply migration → generate → DB build green.
2. **Data layer** — widen `ManagedUserRecord` + select. Data build green.
3. **API surface** — add `_validators.ts`, add `governance-actor.ts`, restructure routes (`[id]/route.ts` + `[id]/primary/section/route.ts`), apply `assertExpectedUpdatedAt`. Filtered admin-API typecheck → 0.
4. **Module dir wipe + rebuild** — drafts → list controller + mutations → primary section controller → list components → record components. Filtered admin-module typecheck → 0.
5. **Dashboard page tweaks** — update list-page imports + props.
6. **Final gates** — overall web typecheck (drops to 5 leftovers) + Next.js build (now passes for the first time since WO landed).
7. **Single bundled commit** for layers 2–5. Layered commit message identifies the 4 sub-sweeps.

---

## Out of scope (explicit)

| Item | Why deferred |
|---|---|
| `setUserPasswordUseCase` HTTP route | No TS error today; the use case is wired into a separate auth flow (verify-email → set-password), not the admin panel. Different sweep if/when surfaced. |
| Migrating `useSingleSectionRecordController` itself out of `shared/engines/record-view/` | Per WO sweep precedent — forces imports + WO + properties + templates + admin all to migrate together. Defer to a dedicated engine-collapse sweep. |
| Migrating `RecordDetailClientScaffold` / `RecordSingleSectionPanel` / `RecordCreateClientScaffold` | Same — engine-collapse sweep. |
| User table preferences (`getResolvedUserTablePreference`, `parseServerTableQueryState`) integration on the new list view | The new `useServerListController` doesn't currently consume `TablePreferencePayload`. WO list also dropped this; restoring it across modules is a separate sweep. |
| 5 pre-existing `modules/shared/engines/record-view/panel/` `../client/...` import errors | Pre-existing engine internals, unrelated to admin. Engine-cleanup sweep. |
| Adding `instructions`-style validator audit to other modules (templates, work-orders, contacts, …) | Separate audit sweep — already offered to user, can pick up if approved. |
| Status update flow (verify/unverify users without password reset) | `canUpdateStatus` permission exists but no UI surface for it today. Out of WO precedent — propose only if user asks. |
| Replacing `useRecordEntryNavigation` + `record-entry` helpers | Engine-stay per WO precedent. |

---

## Critical files (summary)

**New (8):**
- `packages/db/prisma/migrations/{ts}_add_user_updated_at/migration.sql`
- `apps/web/app/api/admin/_validators.ts`
- `apps/web/app/api/admin/users/[id]/primary/section/route.ts`
- `apps/web/server/auth/governance-actor.ts`
- `apps/web/modules/admin/data/mutations.ts`
- `apps/web/modules/admin/data/list-managed-users-request.ts`
- `apps/web/modules/admin/controllers/drafts.ts`
- `apps/web/modules/admin/controllers/use-admin-users-list-mutations.ts`

**Renamed (folder + 2 files):** `apps/web/modules/admin/controller/` → `apps/web/modules/admin/controllers/` (also drop `controller/types.ts`, replaced by `controllers/drafts.ts`).

**Modified / rewritten (~12):**
- `packages/db/prisma/schema.prisma` (User adds `updatedAt`)
- `packages/db/src/admin/shared.ts`
- `packages/db/src/admin/read-repository.ts` (adds `getManagedUserByIdOrThrow`)
- `apps/web/app/api/admin/users/route.ts` (validators extracted; actor narrowed)
- `apps/web/app/api/admin/users/[id]/route.ts` (PATCH split out; DELETE adds optimistic-lock guard)
- `apps/web/modules/admin/components/list/admin-users-client.tsx` (off list-view engine)
- `apps/web/modules/admin/components/list/admin-users-table.tsx` (Grid)
- `apps/web/modules/admin/components/record/primary/admin-user-primary-fields-section.tsx` (off record-view field primitives, uses `@/components/{cells,fields,layout-grid,badges}`)
- `apps/web/modules/admin/components/record/admin-user-create-client.tsx` (off field primitives + transport)
- `apps/web/modules/admin/controllers/use-admin-user-primary-section.ts` (transport swap; revision key now `record.updatedAt`)
- `apps/web/modules/admin/controllers/use-admin-users-list-controller.ts` (drop `useRecordNotices`; add navigation + mutations bundles)
- `apps/web/modules/admin/data/queries.ts` (no engine imports — already clean)
- `apps/web/app/dashboard/admin/users/page.tsx` (list-page props match new client)

---

## Open questions

1. **`apps/web/hooks/` directory**: The user mentioned migrating onto "web/components/, controllers/, hooks/, transport/". `apps/web/{components,controllers,transport,query-policies}/` exist; **`apps/web/hooks/` does NOT exist as a top-level dir** today. WO + imports + templates put their hooks under their own `modules/<name>/controllers/` (plural). Match WO precedent (controllers-plural inside the module) or create a brand-new top-level `apps/web/hooks/`?
   - **Recommendation:** match WO precedent — controllers-plural inside the module. If the user wants a shared cross-module hook later, *that* hook can live in a new `apps/web/hooks/` (case-by-case promotion, like how transport/controllers/query-policies were promoted out of engines).

2. **List-view URL state**: WO list uses 3 URL params (`q`, `sort`, `page`). Admin currently has a 4th — `groupBy` — and supports server-side grouping by role/status. The `useServerListController` from `@/controllers/list-view` doesn't expose grouping today (per WO sweep — empty `allowedGroupFields`). **Drop grouping in this sweep** (matches WO list) or hold off on the off-engine migration until grouping lands in the new controller? Recommend dropping; user can re-add via the planned grouping-tool separation.

3. **`updatedAt` migration default**: Existing rows backfill to `CURRENT_TIMESTAMP` at migration time. That means every existing user gets the same `updatedAt` ≈ migration time. First save after deploy will of course advance it. **Acceptable**, or should the migration backfill from `createdAt` instead (`UPDATE "user" SET "updatedAt" = "createdAt"`)? Recommend backfilling from `createdAt` for correctness — matches the row's actual last-modified time.

4. **Set-password lifecycle field**: `setUserPasswordUseCase` flips `isVerified=true` + writes `password`. With `@updatedAt` directive that path will now also bump `updatedAt`, which is correct semantically — but means the `assertExpectedUpdatedAt` guard on PATCH will need to handle the case where a user verifies between the admin opening the detail page and saving a role change. Recommend leaving as-is — the conflict will surface as a 409 with the standard "user changed before save completed" message and a refresh-snapshot payload. Aligns with how WO/properties handle concurrent edits.

Per CLAUDE.md, plan locks on approval and execution log lands at `a-branch/admin-panel-hardscope-execution.md` with commit SHAs appended layer by layer.
