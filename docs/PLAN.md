# Plan to Production v1

Audit findings and sequenced work for the remaining refactor. Warehouse is the reference implementation; once locked, subsequent modules follow the same path with their own domain rules, use-cases, and repositories.

---

## Audit Summary

- `packages/domain/src/flooring/warehouses` — rules, diff identity, diff validation all **exist**.
- `packages/application/src/flooring/warehouses` — CRUD use-cases + `save-sections-with-locations` (atomic diff) all **exist**.
- `packages/db/src/flooring/warehouses` — read/write repositories split; `applySectionsWithLocationsDiff` is pure data-layer.
- `apps/web/modules/warehouse/api.ts` (415 lines) — **legacy**, duplicates `@builders/db`, bypasses use-cases.
- `apps/web/app/api/warehouses/*` — imports module-local `api.ts` instead of `@builders/application` use-cases.
- First section of warehouse record view **diverges** from manufacturers/contacts/services canonical flow (no `useSingleSectionRecordController`, no `withMutationMeta`, no `/primary/section` route, no mutation receipt, no zod).
- Cut logs / inventory / imports / work-orders have ~42 TS errors tied to `locationId` removal (section now has `number` not `name`; `locationCode` is computed, not stored).
- `FlooringCutLog` has **no status field**; needs one.
- `FlooringWorkOrderItemAllocation` still present; slated for removal.

---

## 1. Warehouse Module (reference build)

### 1a. Backend wiring (API routes → use-cases)
- [ ] Delete `apps/web/modules/warehouse/api.ts` and `apps/web/modules/warehouse/data/api.ts` re-exports.
- [ ] Create `apps/web/app/api/warehouse/_validators.ts` (zod/validators for body parsing).
- [ ] Rewrite `apps/web/app/api/warehouse/route.ts` (list + create) to call `createWarehouseUseCase` from `@builders/application`.
- [ ] Rewrite `apps/web/app/api/warehouse/[id]/route.ts` → **remove** the generic PATCH; keep GET + DELETE only.
- [ ] Add `apps/web/app/api/warehouse/[id]/primary/section/route.ts` (PATCH) → `updateWarehouseUseCase`. Matches manufacturers canonical endpoint.
- [ ] Add `apps/web/app/api/warehouse/[id]/sections-locations/route.ts` (POST, atomic diff) → `saveSectionsWithLocationsUseCase`.
- [ ] Rename route folder `warehouses` → `warehouse` (align with singular module name convention used by contacts/services/manufacturers — verify first).

### 1b. Module folder consolidation
- [ ] Move `modules/warehouse/types.ts` and `modules/warehouse/domain/types.ts` → `packages/domain/src/flooring/warehouses/*` (types already partially there; consolidate form types, remove module-local copies).
- [ ] Move `modules/warehouse/queries.ts` + `modules/warehouse/data/queries.ts` → `packages/db/src/flooring/warehouses/read-repository.ts` (server page-loader queries live in `@builders/db`).
- [ ] Delete `modules/warehouse/data/` after moves.
- [ ] Flatten `modules/warehouse` into `components/list/`, `components/record/`, `controller/list/`, `controller/record/` (match manufacturers layout).
- [ ] Move `modules/warehouse/record/panel/sections/*` → `modules/warehouse/components/record/*-section.tsx`.
- [ ] Move `modules/warehouse/record/panel/controllers/*` → `modules/warehouse/controller/record/use-warehouse-*-section.ts`.

### 1c. First-section flow (match manufacturers)
- [ ] Rewrite `use-warehouse-primary-section.ts` to use `useSingleSectionRecordController<WarehouseRow, WarehouseForm>()`.
- [ ] Add `mutations.ts` with `updateWarehouseRequest()` that wraps body via `withMutationMeta(input, revisionKey)`.
- [ ] Controller POSTs to `/api/warehouse/[id]/primary/section`.
- [ ] Route handler uses `parseMutationEnvelope` → `enforceMutationReceipt` → use-case → `finalizeMutationReceipt`.

### 1d. Sections & Locations atomic save
- [ ] Controller builds diff client-side using `diff-identity` helpers (stable ids + temp ids for new rows).
- [ ] Single POST to `/api/warehouse/[id]/sections-locations` with `{ sections: Diff, locations: Diff }`.
- [ ] Route handler delegates to `saveSectionsWithLocationsUseCase`; use-case runs `validateDiff` → `assignDiffIds` → `applySectionsWithLocationsDiff` inside one transaction.
- [ ] Decide temp-id strategy (client sends `tempId`, server returns resolved id map to reconcile local state).
- [ ] Conflict/error surfacing: return 409 on `duplicate location coords`, `unresolved temp id`, or `stranded location` from `diff-rules`.

### 1e. Verify & document
- [ ] `npm run dev` boots cleanly with zero warehouse-related TS errors.
- [ ] Smoke test: create warehouse → add sections/locations → edit primary → delete warehouse.
- [ ] Document pattern in `docs/` (one short page: routes, use-cases, controller hook, atomic-save contract) as the template other modules follow.

---

## 2. Downstream TypeScript Sweep (unblocks `npm run dev`)

Apply the new location shape: `location: { id, warehouseId, sectionId, rafter, level, section: { number }, warehouse: { name } }`. Compute `locationCode` from `${warehouse}-${section.number}-${rafter}/${level}` in app code. Replace `section.name` → `section.number`.

### 2a. Cut logs
- [ ] Fix `modules/cut-logs/data/queries.ts` — drop `locationCode` select, include `inventory → location → section → warehouse`.
- [ ] Add `status` enum to `FlooringCutLog` in `packages/db/prisma/schema.prisma`: `Pending`, `Confirmed` (values: `"Pending Cut"`, `"Confirmed Cut"` for display).
- [ ] Migration for new status column (default `Pending`).
- [ ] Update cut-log types in `packages/domain/src/flooring/cut-logs/*`.

### 2b. Inventory
- [ ] Fix `modules/inventory/data/api.ts` includes/selects (section.number, nested location).
- [ ] Fix `modules/inventory/domain/types.ts` — expose warehouse + section + rafter/level; drop flat `locationCode`/`locationId`.
- [ ] Fix `use-inventory-primary-section.ts` to consume new shape.

### 2c. Imports
- [ ] Fix `modules/imports/data/api.ts` (8 errors) — same includes/selects.
- [ ] Verify warehouse linkage on `FlooringImportEntry.warehouseId` is still used correctly by UI.

### 2d. Work orders
- [ ] Fix `modules/work-orders/mutations.ts` (line ~85) location select.
- [ ] Fix `material-allocations-editor.tsx` to render composite location.

---

## 3. Cut Logs as Child Rows of Material Items

Replaces the `FlooringWorkOrderItemAllocation` intermediate table.

- [ ] Add FK `FlooringCutLog.workOrderMaterialItemId` (nullable until migrated, then required).
- [ ] Backfill migration: derive cut-log → material-item links from existing allocations.
- [ ] Drop `FlooringWorkOrderItemAllocation` model + migration.
- [ ] Remove `packages/application/src/flooring/work-orders/allocations.ts` (or rewrite against cut logs).
- [ ] Update `work-orders/record/panel/sections/material-allocations-editor.tsx` → "material-items-editor" with cut-log child grid.
- [ ] Child-grid save = atomic diff per material item (same pattern as warehouse sections/locations).
- [ ] Status rules: a cut log with `Confirmed Cut` locks its before/cut/after decimals (domain rule candidate).

---

## 4. Warehouse Linkage Fixes

Verify each module's warehouse FK still resolves after the refactor:

- [ ] `FlooringImportEntry.warehouseId` — UI warehouse picker works.
- [ ] `FlooringInventory.locationId` — picker chooses warehouse → section → rafter/level.
- [ ] `FlooringWorkOrder.*` — warehouse scope honored on material items & cut logs.
- [ ] `FlooringTemplate.warehouseId` — picker works; no stale selects.

---

## 5. Apply Warehouse Pattern to Remaining Grid-Layout Modules

Once §1 is documented, repeat per module: move domain → `packages/domain`, use-cases → `packages/application`, writes → `packages/db`, API routes → `apps/web/app/api/<module>/`, primary section follows manufacturers canonical flow, each grid section gets its own atomic diff POST.

- [ ] Inventory record view (primary section + any grid section).
- [ ] Imports record view.
- [ ] Work orders record view (material items + cut logs child grid is §3).
- [ ] Cut logs record view (if standalone).

---

## Pending (not started)

- [ ] **Properties** module — full refactor following warehouse pattern.
- [ ] **Management Companies** module — full refactor following warehouse pattern.
- [ ] **Templates** module — full refactor following warehouse pattern (warehouse linkage fix handled in §2).
