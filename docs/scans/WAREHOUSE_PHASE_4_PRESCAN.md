# Warehouse Phase 4 Pre-Scan — Application Layer Impact Map

**Date:** 2026-04-16
**Scope:** Read-only scan. Map what Phase 4 creates, touches, depends on, and must preserve. No code changes.

---

## Dependencies already in place — Phase 0 – 3.5 artifacts confirmed

### Domain — `packages/domain/src/flooring/warehouses/`
Barrel `index.ts` re-exports from 6 files:
- `types.js` — `WarehouseRow`, `WarehouseDetail`, `SectionRow`, `LocationRow`, `WarehouseForm`/`SectionForm`/`LocationForm`, `EMPTY_*_FORM` constants, `toWarehouseForm/toSectionForm/toLocationForm` converters
- `warehouse-rules.js` — `WarehouseDependentCounts`, `normalizeWarehouseName`, `isWarehouseNameConflict`, `isWarehouseSlugConflict`, `isWarehouseDeleteBlocked`, `buildWarehouseDeleteBlockedMessage`
- `section-rules.js` — `SectionDependentCounts`, `normalizeSectionName`, `isSectionNameConflict`, `isSectionSlugConflict`, `isSectionDeleteBlocked`, `buildSectionDeleteBlockedMessage`, `doesSectionBelongToWarehouse`
- `location-rules.js` — `LocationDependentCounts`, `normalizeLocationCode`, `isLocationCodeConflict`, `isLocationDeleteBlocked`, `buildLocationDeleteBlockedMessage`
- `diff-rules.js` — `SectionDraft/Update/Delete`, `LocationDraft/Update/Delete`, `SectionsWithLocationsDiff`, `DiffValidationIssue`, `findDuplicateSectionSlugsInDiff(diff, existingSections, slugOf)`, `findDuplicateLocationCodesInDiff(diff, existingLocations)`, `findUnresolvedTempIds(diff)`, `findStrandedLocations(diff, existingLocations)`, `validateDiff(diff, existing, slugOf)`
- `diff-identity.js` — `assignDiffIds<T extends { tempId: string }>(entries, generateId): Array<T & { id: string }>`

### Data — `packages/db/src/flooring/warehouses/`
Barrel `index.ts` re-exports from 3 files:
- `shared.js` — `warehouseRowSelect`, `sectionRowSelect`, `locationRowSelect`, `warehouseDetailSelect`, payload type aliases, `WarehousesDbClient`
- `read-repository.js` — `WarehouseRecord`, `WarehouseDetailRecord`, `SectionRecord`, `LocationRecord`, normalizers; reads: `listWarehouses`, `getWarehouseById`, `getWarehouseDetailById`, `warehouseSlugExists`, `warehouseNameExists`, `getWarehouseDeleteState`, `listSectionsByWarehouse`, `getSectionById`, `sectionSlugExists`, `sectionNameExists`, `getSectionDeleteState`, `listLocationsByWarehouse`, `getLocationById`, `locationCodeExists`, `getLocationDeleteState`
- `write-repository.js` — inputs: `CreateWarehouseInput`, `UpdateWarehouseInput`, `CreateSectionInput`, `UpdateSectionInput`, `CreateLocationInput`, `UpdateLocationInput`; writes: `createWarehouse`, `updateWarehouse`, `deleteWarehouseById`, `createSection`, `updateSection`, `deleteSectionById`, `createLocation`, `updateLocation`, `deleteLocationById`; diff: `ApplyDiffInput`, `ApplyDiffResult`, `applySectionsWithLocationsDiff(tx, input)` — **caller must pre-assign UUIDs on added entries** (entries carry both `tempId` and `id`)

### Shared data infrastructure
- `packages/db/src/shared/row-locks.ts` — `lockFlooringWarehouseRow(tx: Prisma.TransactionClient, warehouseId: string): Promise<void>` (SELECT … FOR UPDATE via $queryRaw)
- `packages/db/src/shared/sectional-save.ts` — `withSectionalSave<T>(parentLock, work): Promise<T>` (opens transaction via `withDatabaseTransaction`, applies lock, runs work)

### Application slug helper — `packages/application/src/shared/slug.ts`
- `slugify(input: string): string` — NFKD normalize, lowercase, hyphenate, throws on empty result
- `generateUniqueSlug(name, slugExists): Promise<string>` — async collision loop; caller supplies existence check

Exported from `packages/application/src/index.ts:7` via named re-export.

### Transaction wrapper — `packages/db/src/client.ts:43-45`
```ts
export function withDatabaseTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(callback)
}
```
**Nesting behavior:** uses Prisma `$transaction`. Postgres does not support true nested transactions; `$transaction` opens a new outer transaction each time. **Calling `withDatabaseTransaction` inside a callback that already received a `tx` is a bug** — the inner call uses the root `db` client and opens a separate transaction, not nested.
- Phase 4 implication: the diff use case MUST NOT wrap `withSectionalSave` inside `withDatabaseTransaction`. `withSectionalSave` already calls `withDatabaseTransaction` internally.
- Single-entity use cases that mirror the manufacturers pattern call `withDatabaseTransaction(async (tx) => { const c = client ?? tx; ... })` where `client` is the optional caller-passed tx client — that pattern is safe because `withDatabaseTransaction` is called once.

---

## Files to create in Phase 4a (single-entity use cases)

Mirror the manufacturers pattern under `packages/application/src/flooring/warehouses/`.

| Path | Purpose |
|---|---|
| `packages/application/src/flooring/warehouses/errors.ts` | `WarehouseErrorCode` union + `WarehouseExecutionError` class (mirror manufacturer errors.ts:1-28) |
| `packages/application/src/flooring/warehouses/types.ts` | `WarehouseInput`/`SectionInput`/`LocationInput` form-side inputs; `WarehouseResult`/`SectionResult`/`LocationResult` type aliases over `@builders/db` records |
| `packages/application/src/flooring/warehouses/create-warehouse.ts` | `createWarehouseUseCase(input, client?)` — generate unique slug via `generateUniqueSlug` + `warehouseSlugExists`, conflict-check name, call `createWarehouse` write, P2002 fallback |
| `packages/application/src/flooring/warehouses/update-warehouse.ts` | `updateWarehouseUseCase(id, input, client?)` — slug immutable (per decision ledger); conflict-check name excluding self, call `updateWarehouse` write |
| `packages/application/src/flooring/warehouses/delete-warehouse.ts` | `deleteWarehouseUseCase(id, client?)` — load delete state, apply `isWarehouseDeleteBlocked` domain predicate, throw `WAREHOUSE_IN_USE` with `buildWarehouseDeleteBlockedMessage`, else call `deleteWarehouseById` |
| `packages/application/src/flooring/warehouses/create-section.ts` | `createSectionUseCase(warehouseId, input, client?)` — verify warehouse exists, generate unique slug via `sectionSlugExists(warehouseId, ...)`, conflict-check name within warehouse, call `createSection` |
| `packages/application/src/flooring/warehouses/update-section.ts` | `updateSectionUseCase(id, input, client?)` — slug immutable; load section, conflict-check name excluding self in same warehouse, call `updateSection` |
| `packages/application/src/flooring/warehouses/delete-section.ts` | `deleteSectionUseCase(id, client?)` — apply `isSectionDeleteBlocked` on locationsCount, else `deleteSectionById` |
| `packages/application/src/flooring/warehouses/create-location.ts` | `createLocationUseCase(warehouseId, input, client?)` — normalize code via `normalizeLocationCode`, use `doesSectionBelongToWarehouse` against `getSectionById`, uniqueness via `locationCodeExists(warehouseId, ...)`, call `createLocation` |
| `packages/application/src/flooring/warehouses/update-location.ts` | `updateLocationUseCase(id, input, client?)` — if `sectionId` provided, verify via `doesSectionBelongToWarehouse` against loaded location's warehouse; if `locationCode` provided, normalize + uniqueness check excluding self; call `updateLocation` |
| `packages/application/src/flooring/warehouses/delete-location.ts` | `deleteLocationUseCase(id, client?)` — load delete state, apply `isLocationDeleteBlocked` on inventoriesCount (NEW guard), else `deleteLocationById` |
| `packages/application/src/flooring/warehouses/index.ts` | Barrel — re-export errors, types, all 9 use case files |

**Also:** add `export * from "./flooring/warehouses/index.js"` to `packages/application/src/index.ts` (currently line 6 is work-orders/allocations; insert before `slugify` re-export or alphabetically after services).

---

## Files to create in Phase 4b (diff use case)

| Path | Purpose |
|---|---|
| `packages/application/src/flooring/warehouses/save-sections-with-locations.ts` | `saveSectionsWithLocationsUseCase(warehouseId, diff, expectedUpdatedAt)` — (1) verify warehouse exists; (2) assign UUIDs to added sections + locations via `assignDiffIds` using `crypto.randomUUID`; (3) call `withSectionalSave((tx) => lockFlooringWarehouseRow(tx, warehouseId), (tx) => { ... })`; (4) inside work: reload warehouse + sections + locations; optimistic-concurrency check on warehouse.updatedAt vs expectedUpdatedAt; compute slug for each added/modified section name; call `validateDiff(diff, existing, slugify)`; throw `DIFF_VALIDATION_FAILED` on any issue; translate domain diff → `ApplyDiffInput` shape (attach slug to added sections); call `applySectionsWithLocationsDiff(tx, applyInput)`; return result with post-state |

Barrel update: add export to the warehouses index.

---

## Reference files to mirror — manufacturers use case

| Reference | Line count | Copy |
|---|---:|---|
| `packages/application/src/flooring/manufacturers/errors.ts` | 27 | Error class shape verbatim (code/message/status/field/payload fields, constructor). Substitute `WarehouseErrorCode` union |
| `packages/application/src/flooring/manufacturers/types.ts` | 11 | Input/Result type alias pattern — re-export record types from `@builders/db` |
| `packages/application/src/flooring/manufacturers/create-manufacturer.ts` | 42 | Full skeleton: optional `client` param; `withDatabaseTransaction(async (tx) => { const c = client ?? tx; ... })`; domain predicate → conflict check → write call → P2002 try/catch |
| `packages/application/src/flooring/manufacturers/update-manufacturer.ts` | 43 | Same pattern, with exclude-self in conflict check |
| `packages/application/src/flooring/manufacturers/delete-manufacturer.ts` | 34 | Load `*DeleteState` → apply domain `is*DeleteBlocked` predicate → throw `*_IN_USE` or call `delete*ById` |
| `packages/application/src/flooring/manufacturers/index.ts` | 5 | Barrel style: `export * from "./errors.js"` + types + each use case file |

---

## Existing code to preserve/absorb

### Inline business logic in the current warehouse module
`apps/web/modules/warehouse/api.ts` holds all current warehouse business rules. These will be deleted in Phase 7–8 but Phase 4 use cases must replicate them:

| Location | Rule | Phase 4 destination |
|---|---|---|
| `api.ts:106-116` (deleteWarehouseRow pre-checks) | Block delete when `workOrdersCount`, `locationsCount`, or `sectionsCount` > 0 | `delete-warehouse.ts` — use `isWarehouseDeleteBlocked` |
| `api.ts:218-222` (deleteSectionRow) | 404 if missing; 409 if `locationsCount > 0` | `delete-section.ts` |
| `api.ts:250-259` (ensureWarehouseSectionMatch) | "Selected section is invalid for this warehouse" — 400 if section.warehouseId mismatch | `create-location.ts` + `update-location.ts` — use `doesSectionBelongToWarehouse` |
| `api.ts:266` (createLocationRow) | Calls `ensureWarehouseSectionMatch` before create | `create-location.ts` |
| `api.ts:298-302` (updateLocationRow) | 404 if missing; re-checks section match if sectionId changes | `update-location.ts` |
| `api.ts:334` (deleteLocationRow) | 404 if missing — **no inventory-count guard today** | `delete-location.ts` — Phase 4 ADDS `isLocationDeleteBlocked` (fixes orphan bug; documented in Phase 2 commit) |
| Trim on create/update name/section name/location code (`api.ts:62, 74, 178, 194, 263, 289-290`) | Canonicalization via `.trim()` | Use domain `normalizeWarehouseName` / `normalizeSectionName` / `normalizeLocationCode` |
| Warehouse name uniqueness | Enforced only by `@unique` DB constraint today, no app-level pre-check | Phase 4 adds app-level `warehouseNameExists` pre-check + P2002 fallback (matches manufacturers pattern) |

### Current routes (Phase 6–8 targets, not Phase 4)
All six route files under `apps/web/app/api/warehouses/`, `/sections/`, `/locations/` currently import from `@/modules/warehouse/api`. Phase 4 ships the use cases without touching routes. Phase 6–8 will rewrite routes to call `*UseCase` functions.

Route files still carry the mutation-envelope plumbing (envelope parse, receipt, telemetry, updatedAt concurrency assertions) — Phase 4 use cases don't need to replicate that; it stays in the route layer. The route currently calls two things Phase 4 absorbs: `createWarehouseRow(input)` (today: direct Prisma create; Phase 4: use-case call) and `deleteWarehouseRow(id)` (today: count-based pre-check + Prisma delete; Phase 4: use-case call).

---

## Outbox verdict

**No outbox events are emitted by warehouse / section / location routes today.** Evidence:
- Grep for `createQueueOutboxEvent|queueDispatch|outbox` across `apps/web/app/api/warehouses`, `/sections`, `/locations`, and `apps/web/modules/warehouse` — **zero matches**.
- No queue messages, no worker job dispatches originating from warehouse mutations.

**Phase 4 verdict:** use cases emit no outbox events. Worth documenting in the Phase 13 pattern doc that warehouse is a pure-mutation module (no async downstream effects).

---

## Capability dependencies

`apps/web/server/auth/access-control.ts:3-14` — current Capability union:
```
"system.access", "governance.access", "adminPanel.access", "users.manage",
"tool.admin", "workOrders.read", "workOrders.write", "workOrders.delete",
"workOrders.allocate", "workOrders.syncTemplate"
```

**`warehouses.read` and `warehouses.manage` are NOT present.** Phase 5 adds them.

Phase 4 use cases do not reference capabilities — capability enforcement is a route-layer concern (`applyRoutePolicy`'s `capability` + `toolSlug` options). Use cases accept already-authorized inputs. Confirmed via manufacturers reference (no capability imports in any manufacturer use case).

---

## Transaction boundary sanity

- `withDatabaseTransaction` wraps `db.$transaction(callback)` — single-scope Prisma managed tx.
- **Nested calls are not supported** in practice: calling `withDatabaseTransaction` inside a callback that already holds a `tx` would re-enter `db.$transaction` on the global client, opening a separate tx (not truly nested). Phase 4 must avoid this.
- Single-entity use cases: call `withDatabaseTransaction(async (tx) => ...)` once at the top; accept optional `client?: Prisma.TransactionClient`; use `const c = client ?? tx` idiom. This matches manufacturers verbatim (see `create-manufacturer.ts:12-14`).
- Diff use case: call `withSectionalSave(parentLock, work)` — do NOT additionally wrap in `withDatabaseTransaction` (would nest and orphan the inner lock).

---

## Red flags

1. **Warehouse module imports are still wired through `@/modules/warehouse/api`** (see all six route files). Phase 4 does not touch this — but anyone reading the commit may wonder why the routes aren't updated. The sequencing is: Phase 4 ships use cases → Phase 6 swaps route imports → Phase 7–8 deletes `apps/web/modules/warehouse/api.ts`. Flagging so this ordering is preserved.

2. **`docs/patterns/MODULE_ANATOMY.md` / `docs/layers/APPLICATION.md` references.** The modules CLAUDE.md (`apps/web/modules/CLAUDE.md`) explicitly requires `data/` with `server-records.ts` + `server-mutations.ts` under each module. Current warehouse module has a flat `api.ts` plus `queries.ts`. Phase 7 module-anatomy work is where the module gets restructured — Phase 4 only creates the application layer and is agnostic to the module's file shape. No blocker, but worth noting that `apps/web/modules/warehouse/types.ts` (currently the UI-layer warehouse types, open in IDE) is NOT the same as `packages/domain/src/flooring/warehouses/types.ts` — do not confuse the two during Phase 4.

3. **Optimistic-concurrency check placement for the diff use case.** The route layer handles single-entity `expectedUpdatedAt` via `assertExpectedUpdatedAt` (see `apps/web/app/api/warehouses/[id]/route.ts:51-56`). The diff use case takes `expectedUpdatedAt` as an argument (the route passes it through). Decision needed: does the diff use case re-read `warehouse.updatedAt` AFTER acquiring the row lock and then compare, or does the route pre-check before calling? The safer pattern is to re-check inside the locked transaction (after `lockFlooringWarehouseRow`) so a concurrent update that lost the lock race doesn't slip past. Phase 4 should commit to this and document it in the save-sections-with-locations.ts file. Not a blocker — just a design question to resolve during Phase 4 authoring.

4. **`generateUniqueSlug` collision loop is caller-managed.** The domain predicate `findDuplicateSectionSlugsInDiff` accepts `slugOf: (name) => string` (synchronous, pure). But `generateUniqueSlug` is async and hits the DB. For the diff use case, we can't call `generateUniqueSlug` for each added section separately (N round trips, plus inconsistent with atomic diff validation). Phase 4 will need a single-pass strategy: compute initial slugs via `slugify(name)`, then run `validateDiff` with a pure `slugOf` that just calls `slugify` — if duplicates exist (within diff or against DB), `validateDiff` returns a `DUPLICATE_SECTION_SLUG*` issue. User fixes the name and retries. This avoids server-side disambiguation during a diff save (which would silently mutate user intent). Worth confirming this is the intended UX before writing Phase 4b. Flagging as a design decision, not a blocker.

5. **`packages/application/src/shared/slug.ts` is currently exported via named re-export (`export { slugify, generateUniqueSlug } from "./shared/slug.js"`), not star re-export.** If Phase 4 adds more shared helpers under `packages/application/src/shared/`, the pattern may need to shift. Minor — not a Phase 4 concern.

No hard blockers. All Phase 0 – 3.5 artifacts import cleanly and expose the surfaces Phase 4 needs.
