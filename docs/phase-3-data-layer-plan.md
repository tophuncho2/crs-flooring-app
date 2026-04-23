# Phase 3 — Data layer: Management Companies + Properties

## Context

Phase 2 extracted all domain logic for both modules into `packages/domain/src/management/`. Phase 3 does the same for the data layer: the canonical Prisma reads/writes move into `packages/db/src/management/`, matching the existing split used by `packages/db/src/flooring/contacts/` (read-repository.ts + write-repository.ts + index.ts barrel).

After this phase the data layer is the only place that talks to Prisma for these two modules. `apps/web/modules/{module}/data/queries.ts` + `data/mutations.ts` become **thin boundary wrappers**: they call canonical reads from `@builders/db`, compose per-page loaders (server pagination, loader timing, connectivity/not-found error envelopes), and return typed result shapes. No raw Prisma, no where/orderBy construction, no select literals in the module.

This phase also fixes the stale Prisma selects left after Phase 1/2 (`templateTag`, `_count.serviceItems`, `padProduct*`) — the new repositories read the current schema only.

Layer contracts being respected:
- Data executes what it's told. No business decisions. No domain rule imports that throw (`validate*`, `assert*`, `is*Blocked`); pure domain normalizers and formatters are allowed per `packages/db/CLAUDE.md`.
- Domain stays pure (Phase 2 guarantee).
- Application layer is Phase 4 — it composes data + domain.

## Reference pattern (verbatim from existing repos)

`packages/db/src/flooring/contacts/` is the canonical shape:

```
flooring/contacts/
├── read-repository.ts      Record type, DbClient alias, select/include literals, normalizers, list*/get*By* functions
├── write-repository.ts     create*Record, update*Record, delete*RecordById — all accept optional client
└── index.ts                re-exports both repositories
```

Conventions to mirror:
- Type alias `{Module}DbClient = PrismaClient | Prisma.TransactionClient` at the top of each repo file.
- Select literals declared as `const` inside the file; duplicated between read and write repos when each needs the same shape (not extracted to `shared.ts` unless there's broader reuse — follows current contacts convention).
- Every read and write function accepts `client?: {Module}DbClient = db` for transaction composition.
- Write-repo input types are inline object types, not separate DTO files. They match the structural shape the app layer will pass in.
- Reads return **normalized records** — repos call the pure normalizers from `@builders/domain` (allowed carve-out per `packages/db/CLAUDE.md`).
- Errors are not caught inside the repo. They propagate; consumers wrap with `withPrismaConnectivityHandling` / `isPrismaNotFoundError` at the boundary.

Shared primitives already in `@builders/db` that the module boundary will keep using:
- `db`, `prisma`, `withDatabaseTransaction` (`client.ts`)
- `PrismaConnectivityIssue`, `PrismaPageLoadIssue`, `PrismaPageDataResult<T>`, `PrismaDetailPageResult<T>`, `getPrismaConnectivityIssue`, `isPrismaNotFoundError`, `createPrismaPageLoadIssue`, `withPrismaConnectivityHandling` (`errors.ts`)
- `DataAccessContext` (`types.ts`)

## Target structure

```
packages/db/src/management/
├── management-companies/
│   ├── read-repository.ts   list*, get*ById, plus where/orderBy builders + selects
│   ├── write-repository.ts  create*Record, update*Record, delete*RecordById
│   └── index.ts             barrel
└── properties/
    ├── read-repository.ts
    ├── write-repository.ts
    └── index.ts
```

Wire both into `packages/db/src/index.ts` — either direct `read-repository`/`write-repository` re-exports (contacts pattern) or via the barrel. Pick the barrel path for consistency with products/warehouses/imports. Example:

```ts
export * from "./management/management-companies/index.js"
export * from "./management/properties/index.js"
```

## What moves into packages/db

### `packages/db/src/management/management-companies/read-repository.ts`

Moved from `apps/web/modules/management-companies/data/queries.ts`:
- `buildManagementCompaniesWhere(searchQuery)` (private helper)
- `buildManagementCompaniesOrderBy({ isAscendingSort, isGroupingEnabled, groupByKeys })` — arguments narrowed to data-native primitives (no `ServerTableQueryState` type import; the fieldMap stays the same)
- Select literals for list row, detail, and option reads
- `listManagementCompanies({ searchQuery?, sort?, pagination? }, client?)` — returns `ManagementCompanyListRow[]`
- `listManagementCompanyOptions(client?)` — returns `ManagementCompanyOption[]`
- `getManagementCompanyById(id, client?)` — returns `ManagementCompanyDetail`
- `countManagementCompanies({ searchQuery? }, client?)` — new split (the `prisma.flooringManagementCompany.count` call currently inlined in `loadManagementCompaniesPageData` moves here)

Each calls the pure normalizer from `@builders/domain` before returning.

### `packages/db/src/management/management-companies/write-repository.ts`

Moved from `apps/web/modules/management-companies/data/mutations.ts`:
- `const managementCompanySelect = { ... } as const` — aligned to the new schema (template rows use `unitType`, not `templateTag`; `_count: { items: true }`, drop `serviceItems`).
- `createManagementCompanyRecord(input, client?)` — input shape is the inline structural object matching Prisma create input.
- `updateManagementCompanyRecord(id, input, client?)` — input is `Partial<...>`.
- `deleteManagementCompanyRecordById(id, client?)`.

### `packages/db/src/management/properties/read-repository.ts`

Moved from `apps/web/modules/properties/data/queries.ts`:
- `buildPropertiesWhere(searchQuery)`
- `buildPropertiesOrderBy({ isAscendingSort, isGroupingEnabled, groupByKeys })`
- Select literals (list + detail + option shapes — already aligned to the new schema after Phase 2)
- `listProperties({ searchQuery?, sort?, pagination? }, client?)`
- `listPropertyOptions(client?)`
- `getPropertyById(id, client?)`
- `countProperties({ searchQuery? }, client?)`

### `packages/db/src/management/properties/write-repository.ts`

Moved from `apps/web/modules/properties/data/mutations.ts`:
- `const propertySelect = { ... } as const` — aligned to new schema.
- `createPropertyRecord(input, client?)`, `updatePropertyRecord(id, input, client?)`, `deletePropertyRecordById(id, client?)`.

### Cross-module loaders that currently live in `properties/data/queries.ts`

`loadPropertyDetailOptions()` pulls from three tables:
- Management-company options → becomes a call to the new `listManagementCompanyOptions()`.
- Warehouse options → stays pointed at the existing `listWarehouses` / `listWarehouseOptions` in `packages/db/src/flooring/warehouses/**`. If no canonical options read exists there yet, add `listWarehouseOptions(client?)` to that repo as a small sidecar (report it in concerns if the existing repo already has something named differently).
- **Pad product options → delete entirely.** `padProductId`/`padProduct` was dropped from `FlooringTemplate` in Phase 1 and has no current consumer path on properties. The dropdown and its loader both go away in this phase.

The composite `loadPropertyDetailOptions` + `getPropertyCreatePageOptions` + `getPropertyDetailPageData` compositions **stay in `apps/web/modules/properties/data/queries.ts`** — they orchestrate multiple repos + connectivity handling, which is a boundary concern.

## Module boundary after Phase 3

After the move `apps/web/modules/{module}/data/` contains only thin composers (per the contacts reference). Each file imports **only** from `@builders/db` (for canonical reads/writes) and from app-layer helpers (`@/server/pagination`, `@/modules/shared/engines/common/application/loader-timing`) — no `prisma`, no raw selects, no where/orderBy.

### `apps/web/modules/management-companies/data/queries.ts` keeps
- `getManagementCompanyDetailPageData(id)` — wraps `getManagementCompanyById` with `isPrismaNotFoundError` + `createPrismaPageLoadIssue`, returns `PrismaDetailPageResult<...>`.
- `loadManagementCompaniesPageData(page, tableState)` — calls `countManagementCompanies` + `listManagementCompanies`, composes server pagination.
- `getManagementCompaniesPageData(page, tableState)` — wraps loader in `withPrismaConnectivityHandling` + `withLoaderTiming`.

Re-exports thin calls into `listManagementCompanies` / `listManagementCompanyOptions` / `getManagementCompanyById` for callers that don't need the page-data envelope (e.g., API routes).

### `apps/web/modules/management-companies/data/mutations.ts` keeps
- `createManagementCompany`, `updateManagementCompany`, `deleteManagementCompany` — these become one-liners that call `createManagementCompanyRecord` etc. from `@builders/db`. Actually these wrappers can also be dropped if callers (API routes) are willing to pull the canonical write directly; mirror whichever pattern contacts uses (contacts keeps thin wrappers). Keep the thin wrapper for now; revisit in Phase 4.

### `apps/web/modules/properties/data/queries.ts` keeps
- `getPropertyDetailPageData`, `getPropertyCreatePageOptions`, `getPropertiesPageData`, `loadPropertiesPageData` — boundary composers using canonical reads via `@builders/db`.
- `loadPropertyDetailOptions` — composite that fans out to mgmt-co + warehouse canonical options reads. Pad products removed.

### `apps/web/modules/properties/data/mutations.ts` keeps
- Thin `createProperty`, `updateProperty`, `deleteProperty` wrappers (pattern match to contacts/management-companies).

## Misplaced data primitives — findings

Scanned both modules for anything that belongs under `packages/db/` but currently isn't, and anything in the module's `data/` that isn't data:

- **Where/orderBy builders** (`buildManagementCompaniesWhere`, `buildManagementCompaniesOrderBy`, `buildPropertiesWhere`, `buildPropertiesOrderBy`) — currently in the module's `data/queries.ts`. These are Prisma query construction, not app layer. **Move to the new repos.**
- **`managementCompanySelect` + inline `property` select literals** — currently in the module's `data/queries.ts` / `data/mutations.ts`. Pure Prisma select shape. **Move to the new repos.**
- **`prisma.*` calls inside the module's `data/**`** — violate the "no Prisma imports in module data" rule implicit in `apps/web/modules/CLAUDE.md` ("thin wrappers over `@builders/db` canonical reads"). **Remove; call canonical reads.**
- **No misplaced error primitives found** — `isPrismaNotFoundError`, `createPrismaPageLoadIssue`, `withPrismaConnectivityHandling`, `PrismaDetailPageResult` are correctly consumed from `@builders/db`. No module-local shadow copies.
- **`CreateManagementCompanyInput` / `UpdateManagementCompanyInput` / property equivalents in `modules/{module}/validators.ts`** — these are HTTP-body parser outputs; they belong with the HTTP parsing (Phase 4 moves to `packages/application/`). Keep them where they are in this phase. The new write repos define their own inline input types (matching structural shape).
- **Stale selects** (`templateTag`, `_count.serviceItems`, `padProduct*`) left over in the two module files from Phase 1/2 — corrected in the new repos; the stale copies disappear when those files are thinned out.
- **No shared "management" data concerns** exist today outside the modules. No need for `packages/db/src/management/shared/` in this phase.

## Schema alignment baked in

The new repos read the current (post-migration) schema only:
- `templateTag` → `unitType` everywhere.
- `_count.serviceItems` dropped — just `_count.items`.
- No `padProduct*` selects anywhere (removed from pad product options loader too).

## Critical files to modify

**Create:**
- `packages/db/src/management/management-companies/read-repository.ts`
- `packages/db/src/management/management-companies/write-repository.ts`
- `packages/db/src/management/management-companies/index.ts`
- `packages/db/src/management/properties/read-repository.ts`
- `packages/db/src/management/properties/write-repository.ts`
- `packages/db/src/management/properties/index.ts`

**Edit:**
- `packages/db/src/index.ts` — add two barrel exports.
- `apps/web/modules/management-companies/data/queries.ts` — thin to boundary composer.
- `apps/web/modules/management-companies/data/mutations.ts` — thin wrappers or pass-throughs.
- `apps/web/modules/properties/data/queries.ts` — thin composer; drop pad product loader.
- `apps/web/modules/properties/data/mutations.ts` — thin wrappers.
- `packages/db/src/flooring/warehouses/read-repository.ts` — add `listWarehouseOptions(client?)` if one doesn't exist yet (confirm during execution).

## Existing utilities reused

- `packages/db/src/flooring/contacts/{read-repository,write-repository,index}.ts` — file/shape template.
- `packages/db/src/errors.ts` — error envelope types and helpers (consumed by module boundaries, not the repos).
- `packages/db/src/client.ts` — `db`, `prisma`, `withDatabaseTransaction` for transaction composition.
- `packages/domain/src/management/**` — `normalizeManagementCompany*` and `normalizeProperty*` called by the new read repos.

## Execution order

1. **Scan the warehouses repo** for an existing `listWarehouseOptions` or equivalent. If missing, add it alongside the new repos.
2. Create `packages/db/src/management/management-companies/{read-repository,write-repository,index}.ts`.
3. Create `packages/db/src/management/properties/{read-repository,write-repository,index}.ts`.
4. Wire both into `packages/db/src/index.ts`.
5. `npm run build --workspace @builders/db` → must be green before touching the modules. Confirms new repos compile in isolation and typecheck against the post-migration Prisma client.
6. Thin out `apps/web/modules/management-companies/data/queries.ts` + `data/mutations.ts` → call canonical reads/writes from `@builders/db`; keep only the boundary composers.
7. Thin out `apps/web/modules/properties/data/queries.ts` + `data/mutations.ts` → same; drop pad products loader.
8. `npm run build --workspace @builders/domain` and `npm run build --workspace @builders/db` — both green.
9. `npm run typecheck --workspace @builders/web` — expect this to **go green for both modules' `data/**` files**. Failures should now be scoped to the remaining phases (record/UI for `apps/web/modules/properties/record/**` still referencing old shapes, and application/routes yet to be restructured).
10. Single commit: "Phase 3: consolidate management-companies + properties data layer into @builders/db; align selects to post-migration schema".

## Concerns

1. **`packages/db` may need `@builders/domain` as a dependency** for the normalizer imports. If the workspace edges aren't wired, `db.build` fails. Verify `packages/db/package.json` has `@builders/domain` listed (it currently doesn't look like it does based on earlier reads) — add it if missing. Domain has no db dependency, so no circular risk.
2. **`ServerTableQueryState` type leaks.** Keeping the repos' list function args data-native (`{ searchQuery?, sort?: { direction, groupByKeys? }, pagination? }`) means the module boundary translates `ServerTableQueryState` → those args. Cheap mapping, keeps data layer free of apps/web types.
3. **`withLoaderTiming` stays in the module boundary** — it's an app-telemetry wrapper and doesn't belong in the data layer. `withPrismaConnectivityHandling` similarly stays at the boundary since it's where the envelope result is constructed.
4. **Thin-wrapper pass-throughs in module `data/mutations.ts`** may look redundant after this phase — they're one-liners calling `@builders/db`. Contacts keeps them because the module's API routes import from `@/modules/{module}/data/mutations`. Keeping them preserves the module-facing API until Phase 4 moves routes to call the canonical writes directly (or, more likely, through `packages/application/` use cases).
5. **Normalizer ownership.** Option A: repos call the domain normalizers and return already-normalized records (matches contacts). Option B: repos return raw rows and callers normalize. Going with **Option A** — it's consistent with the reference module and keeps callers simple. Risk: if the domain normalizer shape drifts from the Prisma select, the repo fails to compile (which is a feature, not a bug).
6. **No test coverage added.** Per sweep direction, stale tests for both modules were already deleted; new tests will be authored in a later pass.
7. **After this phase the modules still violate `modules/CLAUDE.md`** on other axes (record/** UI placement, singular controllers, pad-product dropdown UI that will be cut once record/** is rebuilt). Those are Phase 6. Not in scope here.

## Verification

- `npm run build --workspace @builders/db` → exit 0 after adding the new repos.
- `npm run build --workspace @builders/domain` → exit 0 (no change; regression guard).
- `rg "prisma\." apps/web/modules/management-companies apps/web/modules/properties --glob '!**/*.test.*'` → zero hits.
- `rg "from \"@builders/db\"" apps/web/modules/management-companies/data apps/web/modules/properties/data` → every import points only at `@builders/db` (or the allowed `@/server/pagination` / `@/modules/shared/engines/common/application/loader-timing`).
- `rg "templateTag|serviceItems|padProduct" packages/db/src/management/ apps/web/modules/management-companies/data apps/web/modules/properties/data` → zero hits.
- `npm run typecheck --workspace @builders/web` — management-companies and properties `data/**` files typecheck green; remaining errors confined to `record/**` UI (Phase 6 scope) and `app/api` routes / dashboard pages only if they still reference dropped types.
