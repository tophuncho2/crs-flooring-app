# Warehouse Phase 0.5b Pre-Scan — Location Hardening + Numeric Identity

**Date:** 2026-04-16
**Scope:** Read-only scan. Map the blast radius of dropping `locationCode`, adding `rafter Int` + `level Int` + computed `Location` column, and carrying forward the section-update decision.

---

## Current `FlooringLocation` schema

From `packages/db/prisma/schema.prisma:485-499`:

```prisma
model FlooringLocation {
  id           String              @id @default(uuid())
  warehouseId  String
  warehouse    FlooringWarehouse   @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  sectionId    String
  section      FlooringSection     @relation(fields: [sectionId], references: [id], onDelete: Restrict)
  locationCode String
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  inventories  FlooringInventory[]

  @@unique([warehouseId, locationCode])
  @@index([sectionId])
  @@map("flooring_location")
}
```

**Actual Postgres indexes** (introspected via `pg_indexes` on `public.flooring_location`):
- `flooring_location_pkey` — PRIMARY KEY (id)
- `flooring_location_sectionId_idx` — non-unique on `sectionId`
- `flooring_location_warehouseId_locationCode_key` — UNIQUE on `(warehouseId, locationCode)`

**No standalone index on `warehouseId` alone.** The composite unique on `(warehouseId, locationCode)` serves prefix queries scoped by `warehouseId`, so `listLocationsByWarehouse` still uses an index today.

**FK relationships:**
- `warehouseId → flooring_warehouse.id` — `onDelete: Restrict` ✓ (Phase 0)
- `sectionId → flooring_section.id` — `onDelete: Restrict` ✓ (Phase 0)
- `inventories ← FlooringInventory.locationId` — reverse relation
  - `FlooringInventory.locationId String?` at `schema.prisma:311`
  - FK declared at `schema.prisma:312`: `onDelete: SetNull` (not Restrict). Inventory rows get their locationId cleared if the location is deleted through the DB. App-level `isLocationDeleteBlocked` (Phase 2 domain) blocks the delete before it reaches the DB — so `SetNull` is a defensive fallback; it never fires in normal app flows. Noted, not a blocker.

---

## Row counts (dev DB)

Introspected live against Railway dev DB:
```
{ warehouses: 0, sections: 0, locations: 0, inventories: 0 }
```

**Every warehouse-domain table is empty.** Backfill is a no-op. Migration can be destructive on the location `locationCode` column with no data loss.

---

## `locationCode` call sites (all references)

Grep for `locationCode` across `.ts/.tsx/.js/.mjs/.prisma`. **127 hits across 35 files.** Grouped below:

### Domain / Application / Data layer (warehouse sweep targets)

| Layer | File | Kind |
|---|---|---|
| Domain | `packages/domain/src/flooring/warehouses/types.ts:28,51,66,86` | `LocationRow.locationCode`, `LocationForm.locationCode`, `EMPTY_LOCATION_FORM`, `toLocationForm` |
| Domain | `packages/domain/src/flooring/warehouses/location-rules.ts:5-11` | `normalizeLocationCode`, `isLocationCodeConflict` |
| Domain | `packages/domain/src/flooring/warehouses/diff-rules.ts:26,31,61-62,72-74,102,111-118,173-205,265` | `LocationDraft.locationCode`, `LocationUpdate.locationCode?`, `DUPLICATE_LOCATION_CODE*` issue codes, `ProjectedLocation.locationCode`, `findDuplicateLocationCodesInDiff`, signature of `validateDiff` existing locations |
| Data | `packages/db/src/flooring/warehouses/shared.ts:40,71` | `locationRowSelect.locationCode: true`, `warehouseDetailSelect.locations.orderBy.locationCode` |
| Data | `packages/db/src/flooring/warehouses/read-repository.ts:43,88,284,300-310` | `LocationRecord.locationCode`, `normalizeLocationRow`, `listLocationsByWarehouse` orderBy, `locationCodeExists` function |
| Data | `packages/db/src/flooring/warehouses/write-repository.ts:47,52,148,164,220-222,298,310-311,330` | `CreateLocationInput.locationCode`, `UpdateLocationInput.locationCode?`, `createLocation` data, `updateLocation` data, `ApplyDiffInput.locations.added.locationCode`, `ApplyDiffInput.locations.modified.locationCode?`, reload orderBy |

### Other modules that CONSUME `locationCode` (break when column drops)

| Module | File | Usage | Break severity |
|---|---|---|---|
| `modules/warehouse` (legacy UI) | `apps/web/modules/warehouse/api.ts:145,152,237,241,263,272,277,287-314,358,393,401` | Legacy inline CRUD, select projections, PATCH body parsing | **To be replaced in Phase 6–8** |
| `modules/warehouse` | `apps/web/modules/warehouse/types.ts:14,20,50,86` | UI row/form types | **To be rewritten** |
| `modules/warehouse` | `apps/web/modules/warehouse/use-warehouse-record-controller.ts:17,31,59,76,212-271` | Draft state, sort, validation, POST/PATCH body | **To be rewritten** |
| `modules/warehouse` | `apps/web/modules/warehouse/record/panel/controllers/use-warehouse-sections-section.ts:33,82,107,119-126,210-245,361,385` | Sectional diff UI, validation against duplicates | **To be rewritten** |
| `modules/warehouse` | `apps/web/modules/warehouse/record/panel/sections/warehouse-item-grid.ts:11` | Grid column config key `"locationCode"` | **Rename to e.g. `"label"`** |
| `modules/warehouse` | `apps/web/modules/warehouse/record/panel/sections/warehouse-sections-section.tsx:127-129` | RecordItemCell column key + bound value | **Rename** |
| `modules/inventory` | `apps/web/modules/inventory/domain/types.ts:25,50` | `InventoryRow.locationCode`, `InventoryLocationOption.locationCode` | **Impact: HIGH** — inventory UI shows location label (row table, filters, dropdowns) |
| `modules/inventory` | `apps/web/modules/inventory/data/api.ts:41,86,146,168,319-330` | Select `locationCode`, filter by code, inventoryLabel string, dropdown options | **HIGH** |
| `modules/inventory` | `apps/web/modules/inventory/data/queries.ts:52,199,289,363` | Search by `locationCode` substring, sort by `locationCode`, select `locationCode` | **HIGH** |
| `modules/inventory` | `apps/web/modules/inventory/components/list/inventory-client.tsx:98` | Column definition `getValue: (row) => row.locationCode` | **HIGH** |
| `modules/inventory` | `apps/web/modules/inventory/components/list/inventory-table.tsx:99` | Cell render `{row.locationCode ?? "-"}` | **HIGH** |
| `modules/inventory` | `apps/web/modules/inventory/record/panel/sections/inventory-primary-fields-section.tsx:107` | Dropdown option label | **HIGH** |
| `modules/imports` | `apps/web/modules/imports/domain/types.ts:13,49` | `ImportRow.locationCode`, `ImportLocationOption.locationCode` | **HIGH** |
| `modules/imports` | `apps/web/modules/imports/data/api.ts:128,158,175,348-358` | Select, type, normalize, list options | **HIGH** |
| `modules/imports` | `apps/web/modules/imports/data/queries.ts:195-196` | Dropdown `locationCode` + `label` | **HIGH** |
| `modules/cut-logs` | `apps/web/modules/cut-logs/data/queries.ts:27,52` | Select + display label `"${warehouse.name} / ${location.locationCode}"` | **HIGH** |
| `modules/work-orders` | `apps/web/modules/work-orders/services.ts:164,200` | Allocation row shape, fallback `"Unassigned"` | **HIGH** |
| `modules/work-orders` | `apps/web/modules/work-orders/types.ts:80,94` | Allocation / inventory-option types | **HIGH** |
| `modules/work-orders` | `apps/web/modules/work-orders/queries.ts:284,441` | Select for allocation rows | **HIGH** |
| `modules/work-orders` | `apps/web/modules/work-orders/mutations.ts:85` | Select for inventory after mutation | **HIGH** |
| `modules/work-orders` | `apps/web/modules/work-orders/record/panel/controllers/use-work-order-material-section.ts:293` | Fallback during option mapping | MEDIUM |
| `modules/work-orders` | `apps/web/modules/work-orders/record/panel/shared.ts:271` | Empty row seed | LOW |
| `modules/products` | `apps/web/modules/products/record/panel/sections/product-inventory-rows-section.tsx:45` | Human-readable location concat | MEDIUM |
| Application | `packages/application/src/flooring/work-orders/allocations/types.ts:16,30` | Allocation types | **HIGH** |
| Application | `packages/application/src/flooring/work-orders/allocations/mappers.ts:21,29,57,89,102` | 5 hits, type fields + mapping logic | **HIGH** |
| Data (work-orders) | `packages/db/src/flooring/work-orders/allocations/shared.ts:45,118,164,222` | Select + payload + normalized type | **HIGH** |

### Tests

| File | Hits |
|---|---|
| `apps/web/tests/modules/inventory/inventory-routes.test.ts:114` | Fixture `"A1"` |
| `apps/web/tests/modules/inventory/inventory-client.test.tsx:61,108,184,232,248,262-263,343,407` | Multiple fixtures |
| `apps/web/tests/modules/imports/imports-client.test.tsx:100,155` | Fixtures |
| `apps/web/tests/modules/products/products-detail-client.test.tsx:31` | Fixture |
| `apps/web/tests/modules/work-orders/work-order-allocations-routes.test.ts:131,306` | Fixtures |

### Schema

- `packages/db/prisma/schema.prisma:491,496` — column definition + unique constraint

---

## Modules that break when `locationCode` drops

**HIGH-impact consumers (display or filter by the string today):**
1. `modules/inventory/*` — table column, filter search, sort, dropdown label. Must display `"R{rafter}-L{level}"` instead of raw `locationCode`.
2. `modules/imports/*` — location dropdown and inventory row display. Same rewrite.
3. `modules/cut-logs/*` — single display label (`warehouse.name / location.locationCode`). Swap to computed `Location` column.
4. `modules/work-orders/*` — allocation rows carry `locationCode`; this flows all the way from `packages/db/src/flooring/work-orders/allocations/shared.ts` through `packages/application/src/flooring/work-orders/allocations/mappers.ts` and `types.ts` into `apps/web/modules/work-orders/*`. Renaming propagates through the allocation shape.
5. `modules/products/record/panel/sections/product-inventory-rows-section.tsx` — concat display.

**Phase 6+ work implication:** dropping `locationCode` in Phase 0.5b schema forces a same-commit or coordinated rename across **every** consumer above. Options:

- **A. Same-commit rewrite** — land the schema change + all consumer rewrites together. Biggest diff but type-safe.
- **B. Transition column** — keep `locationCode` as a computed (generated) column in SQL for a deprecation window, while consumers migrate. Postgres supports `GENERATED ALWAYS AS` for stored generated columns (not virtual). Concrete viability: `"Location" TEXT GENERATED ALWAYS AS ('R' || rafter || '-L' || level) STORED`. Consumers keep reading `Location` or `locationCode` (aliased), ignoring the structural change. Schema stays forward-compatible without a big-bang rewrite. Trade-off: requires a follow-up phase to clean up the alias.
- **C. Intermediate shim** — add `rafter`/`level` as new columns next to `locationCode`, populate both, migrate consumers one module at a time. Drop `locationCode` in a later commit. Zero-downtime approach; moderate code churn.

**Recommendation:** given dev DB is empty, Option A is cleanest. Option B is the insurance policy if the sweep stalls mid-phase.

---

## Files requiring revision in Phase 2b + 3b

### Domain (Phase 2b)
| File | Change |
|---|---|
| `packages/domain/src/flooring/warehouses/types.ts:24-32, 49-52, 64-67, 83-88` | Replace `LocationRow.locationCode` with `rafter`, `level`, computed `label: string`. Same for `LocationForm`, `EMPTY_LOCATION_FORM`, `toLocationForm` |
| `packages/domain/src/flooring/warehouses/location-rules.ts:1-23` | Replace `normalizeLocationCode`, `isLocationCodeConflict` with new validators: `isValidRafter(n)`, `isValidLevel(n)`, `isLocationCoordConflict({a, b})` over `(rafter, level)` pair, `formatLocationLabel({rafter, level})` (or move formatter to shared). Keep `isLocationDeleteBlocked`, `buildLocationDeleteBlockedMessage`. |
| `packages/domain/src/flooring/warehouses/diff-rules.ts` (whole file) | `LocationDraft` → `{ tempId, sectionRef, rafter, level }`. `LocationUpdate` → `{ id, sectionId?, rafter?, level?, expectedUpdatedAt }`. `DUPLICATE_LOCATION_CODE*` issue codes → `DUPLICATE_LOCATION_COORD*` with `{ rafter, level }` payload. `projectPostDiffLocations` projects `{rafter, level}` tuples. `findDuplicateLocationCodesInDiff` → `findDuplicateLocationCoordsInDiff`. `validateDiff` existing-locations arg changes from `{ locationCode }` to `{ rafter, level }`. |
| `packages/domain/src/flooring/warehouses/index.ts` | Barrel — no change needed (re-exports all) |
| `packages/domain/src/shared/numbering.ts` (new, per Phase 2b plan) | Add `formatLocationLabel(rafter, level)` here alongside `formatWarehouseLabel`/`formatSectionLabel` so all label formatters live together. No existing constants conflict (grep confirmed). |

### Data (Phase 3b)
| File | Change |
|---|---|
| `packages/db/src/flooring/warehouses/shared.ts:36-48, 65-72` | `locationRowSelect` — replace `locationCode: true` with `rafter: true, level: true`. Optionally project computed `label` if Postgres generated column is used (Option B above). `warehouseDetailSelect.locations.orderBy` — change from `locationCode` to `[{ rafter: "asc" }, { level: "asc" }]` |
| `packages/db/src/flooring/warehouses/read-repository.ts:35-47, 76-95, 277-333` | `LocationRecord` — replace `locationCode: string` with `rafter: number, level: number, label: string`. `normalizeLocationRow` constructs `label` via `formatLocationLabel`. `listLocationsByWarehouse` orderBy updated. Drop `locationCodeExists`; add `locationCoordExists(warehouseId, rafter, level, options)`. `getLocationDeleteState` unchanged. |
| `packages/db/src/flooring/warehouses/write-repository.ts:44-53, 135-170, 215-225, 290-320` | `CreateLocationInput` — `{ warehouseId, sectionId, rafter, level }`. `UpdateLocationInput` — `{ sectionId?, rafter?, level? }`. `createLocation`, `updateLocation` data mapping. `ApplyDiffInput.locations.added` — `{ tempId, sectionRef, rafter, level }`. `ApplyDiffInput.locations.modified` — `{ id, sectionId?, rafter?, level? }`. |

**Plus Phase 2b/3b carryover work already on the plan:** slug/name removal (already started via Phase 0.5 schema edit; Phase 2b/3b source-code edits still pending).

---

## Section update decision input

Scanned `packages/db/prisma/schema.prisma:472-483` (post-Phase-0.5 state):

```prisma
model FlooringSection {
  id          String             @id @default(uuid())
  warehouseId String
  warehouse   FlooringWarehouse  @relation(...)
  number      Int
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  locations   FlooringLocation[]
  @@unique([warehouseId, number])
  @@map("flooring_section")
}
```

**Scalar fields after Phase 0.5:** `id`, `warehouseId`, `number`, `createdAt`, `updatedAt`. Every one is immutable from the application perspective:
- `id` — identity
- `warehouseId` — ownership (moving a section is not a modeled operation)
- `number` — auto-assigned, never reused
- `createdAt`/`updatedAt` — system-managed

**No description, no notes, no metadata, no labels, no color tags, no sort order field, no active flag.**

**Verdict: sections have ZERO editable fields.**

**Implications for Phase 3b and 4a** (already surfaced in prior discussion; re-confirming with post-0.5 schema in hand):
- Phase 3b: delete `UpdateSectionInput`, delete `updateSection` write helper. `ApplyDiffInput.sections.modified` can be removed entirely (nothing to modify).
- Phase 4a: skip `update-section.ts`. Drop `SECTION_VALIDATION_FAILED` error code.
- Domain `diff-rules.ts`: remove `SectionUpdate` type (or keep only as `{ id, expectedUpdatedAt }` if future fields are anticipated — not recommended; adds dead weight).

---

## Index gap

After the Phase 0.5b migration (once `locationCode` is dropped), the unique index `flooring_location_warehouseId_locationCode_key` goes away. A new unique `(warehouseId, rafter, level)` index replaces it. That covers `WHERE warehouseId = ?` prefix scans — same reach as today.

**Remaining gap:** no index on `warehouseId` alone for locations. In practice the composite unique covers it, so no action needed.

**Dropdown-heavy reads that scan all locations per warehouse:**
- `modules/inventory/data/api.ts:323` — `orderBy: [{ warehouse: { name } }, { locationCode }]` — becomes `orderBy: [{ warehouse: { name } }, { rafter }, { level }]`. Index on `(warehouseId, rafter, level)` serves this.
- `modules/imports/data/api.ts:352` — same pattern.
- `modules/warehouse` detail page — same.

**No new index recommended.** Existing composite-unique gives index coverage.

---

## Backfill verdict

**Dev DB: all warehouse tables empty.** Zero locations, zero inventories. Backfill is a trivial no-op — the migration can drop `locationCode` directly and add `rafter Int NOT NULL`, `level Int NOT NULL` with a unique constraint in a single ALTER TABLE block.

**Production:** no production data exists (user confirmed earlier in the sweep). Same story — zero backfill risk.

**Recommendation:** use Option A (same-commit rewrite) with a minimal migration:
1. `ALTER TABLE flooring_location ADD COLUMN "rafter" INTEGER, ADD COLUMN "level" INTEGER`
2. (Empty tables → no backfill step needed)
3. `ALTER TABLE flooring_location ALTER COLUMN "rafter" SET NOT NULL, ALTER COLUMN "level" SET NOT NULL`
4. `DROP INDEX flooring_location_warehouseId_locationCode_key`
5. `ALTER TABLE flooring_location DROP COLUMN "locationCode"`
6. `CREATE UNIQUE INDEX flooring_location_warehouseId_rafter_level_key ON flooring_location ("warehouseId", "rafter", "level")`

If the user wants range enforcement at the DB level (defensive beyond domain validators): add `CHECK (rafter BETWEEN 1 AND 99 AND level BETWEEN 1 AND 99)` on the table. User's plan says "no SQL CHECK" — so omit.

---

## Display label conventions — no conflicts

Grep for existing `"W${...}"`, `"S${...}"`, `"R${...}"` template-literal patterns or `formatWarehouseLabel`/`formatSectionLabel`/`formatLocationLabel`:

- Zero hits.

`level` as a field name appears in 27 files — all for logging severity (`level: "error"`, `level: "warn"`). No collision with a Prisma model field, no collision with a UI component prop. Safe to adopt as a `FlooringLocation` column name.

`rafter` as a field name appears in zero files. Clean.

**Recommended home:** `packages/domain/src/shared/numbering.ts` (per Phase 2b plan). Export three formatters:
```ts
export function formatWarehouseLabel(number: number): string
export function formatSectionLabel(number: number): string
export function formatLocationLabel(rafter: number, level: number): string
```

Re-exported from `packages/domain/src/shared/index.ts` (new file) → `packages/domain/src/index.ts` line 5 block.

---

## Red flags

1. **Work-orders allocation shape carries `locationCode` deep into the application and data layers** (`packages/application/src/flooring/work-orders/allocations/*`, `packages/db/src/flooring/work-orders/allocations/*`). Renaming to `locationLabel` or `rafter`+`level` touches 9+ files outside `warehouses/` and risks breaking the allocation outbox dispatcher (`apps/relay/src/dispatch/work-order-allocation-outbox-dispatcher.ts` — no direct `locationCode` hits there on grep, but the serialized allocation payload shape is what the dispatcher consumes). **Check whether the allocation event JSON sent to the relay contains `locationCode` as a stable public contract.** If yes, renaming is a breaking change; need a shim. Flagging — could block Phase 6+.

2. **Tests carry hardcoded `"A1"`, `"B2"`, `"A-1"` fixtures.** These all belong to broken/deletable test files (inventory-routes, inventory-client, imports-client, products-detail-client, work-order-allocations-routes — most are already failing in the pre-sweep baseline). Not a Phase 0.5b blocker, but they'll need rewrites in their own sweep phases.

3. **The legacy `apps/web/modules/warehouse/` UI controllers parse `locationCode` as a user input string and validate for uniqueness per-section via case-insensitive comparison** (`use-warehouse-sections-section.ts:107-126`). This enforcement layer is currently duplicated with domain rules. Phase 6+ rewrites must replace the UI-side duplicate-check with a call into domain's `findDuplicateLocationCoordsInDiff`. Not a 0.5b concern but documented for sweep continuity.

4. **Postgres range enforcement deliberately absent.** The plan says "1-99 enforced by domain validators (no SQL CHECK)". Acceptable, but means any direct-SQL mutation (outside the app) can write invalid rafter/level values. If that risk matters, a `CHECK` constraint is trivial to add. Flagging as a design choice, not a blocker.

5. **Computed `label` column strategy.** The plan says `Location` is "computed by application, enforced by domain rules, write layer writes only". Two readings:
   - (a) Application computes a `label` string and writes it to a DB column alongside `rafter`/`level` (denormalized, redundant).
   - (b) Application computes `label` on read only; DB stores just `rafter`/`level`.
   
   Reading the plan: "write layer writes only" suggests (a) — there's a `Location String` column. But storing both `rafter`+`level` and a computed `label` risks drift if the formatter changes. Recommend (b) — store only `rafter`+`level`, compute `label` in the read-repository normalizer. This matches how the scan found display labels built today (concat in queries.ts / api.ts, never stored). **Flagging as a decision to confirm before Phase 3b schema + data-layer work.**

6. **Ordering trip-hazard.** Current `listLocationsByWarehouse` sorts by `locationCode` (lexicographic). Switching to `orderBy: [{ rafter }, { level }]` sorts numerically, so rows currently displayed as `"A-1, A-10, A-2"` (lexicographic) will become `"R1-L1, R2-L1, R10-L1"` (numeric). UI consumers that rely on lexicographic order don't exist today (all sorts go through the same `orderBy` pathway), so this is safe — but worth a pre-flight check during Phase 6+ UI rewrite.

No hard blockers. Phase 0.5b is safe to schedule pending:
- Section update decision (answered: **no editable fields**)
- Red flag #5 decision (store `label` column vs compute-on-read)
- Red flag #1 investigation (relay contract on allocation payload shape)
