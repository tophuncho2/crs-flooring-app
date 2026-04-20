Inventory Plans

Inventort is entered by 
1. Create import row (cananicol section save)
2. add inventory rows to 2nd section of imports record view (cananicol diff sectional save)
3. Cut logs not viewable or toggleable or editable from imports record view. 
4. Inventory rows need a bolean to indicate weather they are have actually been imported to the warehouse.

**Warehouse link needs to be resolved**
1. Imports
- Move Domain into packages/domain
- Move application use cases to packages/application
- Packages/db will be where imports read and write repositories will live
- /record folder will be consolidated into components/ list/ and record/ and the controllers will go under controllers/
- data/ will hold the mutations and queueries files
-  Routes need a _validators file for the edge of routes
- Domain will still validate with its own rules
- Dashbaord/ will import from modules and queueries to render pages.

**Location and warehouse links for inventory and cut logs need to be resolved, current typescript error**
2. Inventory
- Editable from imports record view and inventory record view.
- Move Domain into packages/domain
- Move application use cases to packages/application
- Packages/db will be where inventory read and write repositories will live
- /record folder will be consolidated into components/ list/ and record/ and the controllers will go under controllers/
- modules/x/data/ will hold the mutations and queueries files
-  Routes need a _validators file for the edge of routes
- Domain will still validate with its own rules
- Dashbaord/ will import from modules and queueries to render pages.

3. Cut logs
- Lives within inventory record view
- later will be editable inside of work orders record view. 
- Move Domain into packages/domain
- Move application use cases to packages/application
- Packages/db will be where cut logs read and write repositories will live
- /record folder will be consolidated into components/ list/ and record/ and the controllers will go under controllers/
- modules/x/data/ will hold the mutations and queueries files
-  Routes need a _validators file for the edge of routes
- Domain will still validate with its own rules
- Dashbaord/ will import from modules and queueries to render pages.
- Adding a cut log effects the running balance of an inventory item
- Add a display status to cut logs for display only - later may tie into a domain rule
- No cut logs dashboard page for now, will only live in inventory record view and later the work orders record view.
- cananicol diff

Open an inventory record view to manage cut logs - cut logs will later be linkable to work orders

Work Order
Main Section
1. Update schema with new rows
2. Harden the link to warehouse
3. Harden the main section mutation to follow the cananicol. 
1. Remove the allocation items table in between material items and inventory
- Replace the allocation items child scoped rows of material items with cut logs
- material items and work orders both link to cut logs
- cut logs from work orders record view is what fufills a material items quantity
2. Re wire the warehouse link so it porperly links to a work order row
3. each added work order row is WO+1
4. Re wire warehouse locations to link to inventory rows.
5. 

---

# Imports Module Sweep — Phased Plan (scoped to imports only)

## Context

The imports module currently lives as an app-local stack: `modules/imports/application/*` for use cases, `modules/imports/domain/*` for types/rules/enums, `modules/imports/data/api.ts` calling Prisma directly with the pre-warehouse-sweep shape (causes ~10 TS errors on location selects), and `modules/imports/record/*` in the un-consolidated panel layout. The route layer at `apps/web/app/api/imports/*` already runs the mutation lifecycle (receipt / telemetry / envelope) but calls module-local use cases with an ad-hoc identity validator, not a route-edge `_validators.ts`. Import entry + its child inventory rows are saved in a single PATCH that does a **delete-and-recreate** of all inventory rows — breaks any references from cut logs / work-order allocations and is the opposite of the warehouse sections-locations canonical atomic diff.

This sweep brings imports to the shape established by warehouse / contacts / manufacturers / products: packages-layer separation, route-edge validation, split mutation routes, client reconciliation from the POST/PATCH response (no refetch), and atomic diff for the inventory-rows child grid. Inventory gets a minimal scaffolding for its diff types/rules in this sweep (consumed by imports); inventory's full sweep — its own CRUD routes, record view, TS cleanup, cut-log linkage — happens after.

### Verified current state

- `FlooringImportEntry` prisma: `id, importNumber Int @unique @default(autoincrement()), orderNumber String?, tag String?, transportType String (free-form), status String (free-form), warehouseId String?, warehouse (relation onDelete:SetNull), notes String?, createdAt, updatedAt, inventories FlooringInventory[]`. No status/transportType enums at the DB level.
- `FlooringInventory` prisma: `id, importEntryId? → FlooringImportEntry (onDelete:Restrict), productId → FlooringProduct, itemNumber, dyeLot?, locationId? → FlooringLocation (onDelete:SetNull), stockCount Decimal, reservedStockCount Decimal, cost Decimal?, freight Decimal?, notes?, fifoReceivedAt, createdAt, updatedAt`. `@@unique([locationId, itemNumber])` and FIFO index on `(productId, fifoReceivedAt, itemNumber, id)`.
- `modules/imports/application/import-entry.ts` + `import-ingest.ts` — use-cases that call `createImportEntry` / `updateImportEntry` / `deleteImportEntry` in `modules/imports/data/api.ts`. Route calls these directly.
- `modules/imports/data/api.ts` — direct Prisma: `createImportEntry` transactionally creates the entry and bulk-creates inventory rows; `updateImportEntry` deletes ALL inventory for the entry then bulk-recreates. Validates `transportType ∈ {RETURN, PURCHASE_ORDER}` and `status ∈ {PENDING, FINAL}`. Throws 10 TS errors on location-shape selects.
- `modules/imports/domain/contracts.ts` — `IMPORT_TRANSPORT_TYPE_OPTIONS`, `IMPORT_STATUS_OPTIONS` constants (pseudo-enums).
- `modules/imports/domain/summary.ts` — `calculateImportItemTotal`, `calculateImportSummary` (pure — trivial move to domain package).
- `modules/imports/record/panel/controllers/use-import-inventory-rows-section.ts` — does the grid save by PATCHing the WHOLE import (primary + inventory rows) to `/api/imports/[id]`; `buildImportMutationPayload` packs everything together → drives the delete-recreate server-side.
- `modules/imports/domain/types.ts` — ImportRow, ImportInventoryRowDraft, LocationOption, primary form shape, `validateImportInventoryDrafts`, `applyDefaultLocationToImportRow`, mutation payload builder.
- `/api/imports/route.ts` — GET list + POST create with `toolSlug: "warehouse"`, envelope + receipt + telemetry. POST uses identity validator.
- `/api/imports/[id]/route.ts` — GET detail + PATCH + DELETE. Snapshot via `getImportEntryById`, `assertExpectedUpdatedAt(body, existing)` (the pre-refactor positional signature — will need canonical `{ actualUpdatedAt, expectedUpdatedAt, snapshot, message }`).
- `/api/imports/options/route.ts` — GET, returns warehouse + product options.
- Dashboard pages hit `@/modules/imports/data/queries.ts` for list/detail/create loaders.
- Warehouse link in imports already uses `warehouseId` + relation properly (not stale). The TS errors are in inventory `location` selects, not warehouse.

### Target end state

```
apps/web/modules/imports/
├── components/
│   ├── list/    (imports-client, imports-table, filter defs)
│   └── record/  (detail client, create client, record panel, primary section, inventory rows section, grids)
├── controllers/ (list controller + primary section + inventory-rows section)
└── data/
    ├── mutations.ts  (client helpers: create/update/delete + inventory-rows atomic diff)
    └── queries.ts    (thin wrappers around @builders/db canonical reads)

packages/db/src/flooring/imports/{shared,read-repository,write-repository,index}.ts
packages/domain/src/flooring/imports/{types,import-rules,inventory-rows-diff,errors,index}.ts
packages/application/src/flooring/imports/{types,errors,create-import,update-import,delete-import,save-inventory-rows,index}.ts

apps/web/app/api/imports/
├── _validators.ts                                  (validateImportInput, validateInventoryRowsDiff)
├── route.ts                                        (GET list + POST create)
├── [id]/
│   ├── route.ts                                    (DELETE only)
│   ├── primary/section/route.ts                    (PATCH primary)
│   └── inventory-rows/section/route.ts             (PATCH atomic diff)
└── options/route.ts                                (GET form options)
```

Transport guarantees on all three mutations (create / update primary / update inventory-rows / delete): `applyRoutePolicy` + per-scope rate limit + `parseMutationEnvelope(body, validator, { requireExpectedUpdatedAt: true })` for PATCH/DELETE + `enforceMutationReceipt` idempotency + `withMutationTelemetry` + `finalizeMutationReceipt`. Transactions live inside the use case via `withDatabaseTransaction` from `@builders/db`.

Create/update/delete responses carry the full canonical `ImportDetailRecord` so the client reconciles inline — no refetch.

### Explicitly NOT in scope (inventory + cut-logs + work-orders get their own sweeps)

- Inventory CRUD routes / record view / list page.
- Inventory's own use-case layer beyond the diff primitives imports consumes.
- Cut logs: not surfaced in the import detail view (UI keeps the current "no cut-logs here" behavior).
- Work-order allocations: unchanged.
- Inventory's TS error cleanup (10+ errors in `modules/inventory/data/api.ts` stay until inventory sweep).
- Renaming `FlooringImportEntry.status` and `transportType` to Prisma enums (free-form strings stay; validators enforce shape).

---

## Phase 1 — Prisma: add `isImported` boolean to FlooringInventory

**Intent:** Per your note, inventory rows need a flag for "actually received into the warehouse". Adds the column now so the domain + UI can render it in this sweep; behavior rules (when it flips) can be layered in later.

### Changes
- `packages/db/prisma/schema.prisma` — on `FlooringInventory`, add `isImported Boolean @default(false)` between `notes` and `fifoReceivedAt`.
- Migration: `npx prisma migrate diff --from-migrations … --to-schema-datamodel … --script` OR handcraft a migration file `YYYYMMDDHHMMSS_add_inventory_is_imported/migration.sql` containing `ALTER TABLE "flooring_inventory" ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false;` (no data to preserve).
- Apply via `npm run db:deploy --workspace @builders/db`. Rebuild `@builders/db`.

### Verification gate
- Migration applies cleanly.
- `npm run build --workspace @builders/db` succeeds.
- Prisma client types now include `isImported`.

---

## Phase 2 — Build `packages/db/src/flooring/imports/`

**Intent:** Canonical read + write repos. Follows warehouse/products pattern.

### Files created
- `shared.ts` — `ImportsDbClient`, `importRowSelect`, `importDetailSelect` (with `inventories` include), `importOptionSelect`, payload types.
- `read-repository.ts` — records (`ImportRecord`, `ImportDetailRecord`, `ImportInventoryRecord`, `ImportOptionRecord`), normalizers (including location display via `warehouseName / sectionNumber / formatLocationLabel(rafter, level)` — canonical warehouse shape, no stale `locationCode`), readers (`listImports`, `getImportById`, `getImportDetailById`, `listImportOptions`, `importNumberExists` — if needed, `getImportDeleteState`).
- `write-repository.ts` — input types (`CreateImportInput`, `UpdateImportInput` — metadata only), writers (`createImport`, `updateImport`, `deleteImportById`), plus the atomic diff primitive `applyImportInventoryRowsDiff(tx, input) → { inventoryRows, tempIdMap }` (batch deleteMany → batch createMany → per-row update loop for modifications → reload). Parent-row `SELECT … FOR UPDATE` via `$queryRaw` inline (not factored out — we dropped `withSectionalSave` during warehouse sweep).
- `index.ts` — barrel.
- `packages/db/src/index.ts` — add `export * from "./flooring/imports/index.js"`.

### Verification gate
- `npm run build --workspace @builders/db` clean.
- Apps/web unchanged (new exports are additive).

---

## Phase 3 — Build `packages/domain/src/flooring/imports/`

**Intent:** Types, rules, diff validation, errors.

### Files created
- `types.ts` — `ImportRow`, `ImportForm` (primary section), `ImportInventoryRowDraft` (UI-facing row), `EMPTY_IMPORT_FORM`, `toImportForm(row)`, `applyDefaultLocationToImportRow`, `LocationOption`. Pseudo-enum exports: `IMPORT_STATUS_VALUES` / `IMPORT_TRANSPORT_TYPE_VALUES` + label helpers. Move `calculateImportItemTotal` / `calculateImportSummary` here from `modules/imports/domain/summary.ts` (pure, no I/O).
- `import-rules.ts` — `isImportStatus(value)`, `isImportTransportType(value)`, `isImportDeleteBlocked(counts)` + message builder (block if FINAL status OR any inventory rows already `isImported=true` OR cut logs exist on child inventory), `buildImportDeleteBlockedMessage`.
- `inventory-rows-diff.ts` — diff type shapes scoped to import-inventory-rows:
  ```
  InventoryRowDraft = { tempId, productId, itemNumber, dyeLot?, locationId?, stockCount, cost?, freight?, notes?, isImported? }
  InventoryRowUpdate = { id, expectedUpdatedAt, productId?, itemNumber?, dyeLot?, locationId?, stockCount?, cost?, freight?, notes?, isImported? }
  InventoryRowDelete = { id, expectedUpdatedAt }
  ImportInventoryRowsDiff = { added, modified, deleted }
  DiffValidationIssue = DUPLICATE_ITEM_NUMBER_PER_LOCATION | LOCATION_WAREHOUSE_MISMATCH | UNKNOWN_PRODUCT | UNKNOWN_LOCATION
  ```
  Plus `validateInventoryRowsDiff(diff, existingRows, warehouseId) → DiffValidationIssue[]` and `describeInventoryRowsDiffIssue(issue) → string` — mirrors how warehouse diff-rules works.
- `errors.ts` — `ImportExecutionError` class + code union (`IMPORT_NOT_FOUND`, `IMPORT_IN_USE`, `IMPORT_VALIDATION_FAILED`, `IMPORT_STATUS_INVALID`, `IMPORT_TRANSPORT_TYPE_INVALID`, `IMPORT_WAREHOUSE_NOT_FOUND`, `IMPORT_LOCATION_NOT_FOUND`, `IMPORT_ITEM_NUMBER_CONFLICT`, `IMPORT_INVENTORY_DIFF_VALIDATION_FAILED`).
- `index.ts` — barrel.
- `packages/domain/src/index.ts` — add `export * from "./flooring/imports/index.js"`.

### Note on inventory-rule scope
The diff rules above are scoped to **what imports needs**. General inventory domain (stock decrementing on allocation, FIFO selection, cut-log impact on running balance) stays in its own future package. For this sweep, inventory's validation lives in `imports/inventory-rows-diff.ts`.

### Verification gate
- `npm run build --workspace @builders/domain` clean.

---

## Phase 4 — Build `packages/application/src/flooring/imports/`

**Intent:** Use cases. Orchestrate domain + db. Transaction ownership.

### Files created
- `types.ts` — `CreateImportInput` (metadata only), `UpdateImportInput` (Partial), `ImportResult = ImportDetailRecord`, `SaveInventoryRowsResult = { importEntry: ImportDetailRecord; tempIdMap }`.
- `errors.ts` — re-export from `@builders/domain`.
- `create-import.ts` — `createImportUseCase(input, client?)`:
  1. Validate status + transportType via domain.
  2. If `warehouseId` present: resolve via `getWarehouseById` from `@builders/db` → 400 `IMPORT_WAREHOUSE_NOT_FOUND` if missing.
  3. `createImport` (metadata only — no inventory rows yet; user adds rows via the grid save route after create).
  4. Re-read + return `ImportDetailRecord`.
- `update-import.ts` — `updateImportUseCase(id, input, client?)`: load via `getImportById` → 404 if missing; validate status/transportType changes; re-resolve warehouse if changed; `updateImport`; return fresh `ImportDetailRecord`.
- `delete-import.ts` — load `getImportDeleteState` → apply domain `isImportDeleteBlocked` (blocks on FINAL status or any `isImported=true` inventory rows or any cut logs referencing child inventory) → `deleteImportById`.
- `save-inventory-rows.ts` — `saveImportInventoryRowsUseCase(id, diff, client?)`:
  1. Open transaction, `SELECT … FOR UPDATE` on the import row.
  2. Validate status is not `FINAL` (can't modify rows on a finalized import — domain rule).
  3. Load current inventory rows + warehouse-location references.
  4. Run domain `validateInventoryRowsDiff` → throw `IMPORT_INVENTORY_DIFF_VALIDATION_FAILED` with readable message if issues.
  5. Resolve locations per row via `getLocationById`. Assert `location.warehouseId === importEntry.warehouseId`.
  6. Call `applyImportInventoryRowsDiff` from `@builders/db`. Response carries `tempIdMap`.
  7. Re-read `ImportDetailRecord` via `getImportDetailById`. Return `{ importEntry, tempIdMap }`.
- `index.ts` — barrel.
- `packages/application/src/index.ts` — add `export * from "./flooring/imports/index.js"`.

### Verification gate
- `npm run build --workspace @builders/application` clean.

---

## Phase 5 — Route sweep

**Intent:** Split mutations into canonical files, add route-edge validator, wire every handler to a use case.

### Files created
- `apps/web/app/api/imports/_validators.ts` — `validateImportInput(body)` (primary metadata; throws `ImportExecutionError`), `validateInventoryRowsDiff(body)` (structural type-guards for the atomic diff body; semantic checks run in the domain rule inside the use case).
- `apps/web/app/api/imports/[id]/primary/section/route.ts` — PATCH only → `updateImportUseCase`. Rate scope `imports.primary.section.replace`, 40 / 10 min. Pattern mirrored from `/api/products/[id]/primary/section/route.ts`.
- `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` — PATCH only → `saveImportInventoryRowsUseCase`. Rate scope `imports.inventory-rows.section.replace`, 40 / 10 min. Response body `{ importEntry: ImportDetailRecord, tempIdMap }` so the client can reconcile temp IDs → real IDs.

### Files rewritten
- `apps/web/app/api/imports/route.ts` — GET switches to `listImports` from `@builders/db`; POST switches to `createImportUseCase` with `validateImportInput`. Full envelope lifecycle. `toolSlug: "warehouse"` preserved (existing access control; re-evaluate if a dedicated slug makes sense — out of scope for this sweep).
- `apps/web/app/api/imports/[id]/route.ts` — **remove GET and PATCH**; DELETE only → `deleteImportUseCase`. Canonical snapshot + `assertExpectedUpdatedAt({ actualUpdatedAt, expectedUpdatedAt, snapshot, message })` form (not the positional legacy).
- `apps/web/app/api/imports/options/route.ts` — thin wrapper calling `listImportOptions` from `@builders/db`; drop its dependency on `@/modules/imports/data/queries`.

### Files deleted
- `apps/web/modules/imports/application/import-entry.ts`, `import-ingest.ts` (obsolete once routes switch to `@builders/application`).
- `apps/web/modules/imports/application/` directory.

### Verification gate
- Typecheck clean for all four route files and `_validators.ts`.
- Envelopes: POST (no `requireExpectedUpdatedAt`), PATCH + DELETE (yes).
- `grep -rn "@/modules/imports/application" apps/web` → zero.

---

## Phase 6 — Module slim + client mutations + data hardening

**Intent:** Flatten the module to the canonical four-folder shape; hand the routes client helpers; make `data/queries.ts` a thin contacts-shaped wrapper over canonical reads.

### Files created
- `apps/web/modules/imports/data/mutations.ts` — four client helpers wrapping `withMutationMeta`, all using `requestJson<{ import... }>`:
  - `createImportRequest(input)` → POST `/api/imports`
  - `updateImportRequest(id, input, revisionKey)` → PATCH `/api/imports/:id/primary/section`
  - `deleteImportRequest(id, updatedAt)` → DELETE `/api/imports/:id`
  - `updateImportInventoryRowsRequest(id, diff, revisionKey)` → PATCH `/api/imports/:id/inventory-rows/section`

### Files rewritten
- `apps/web/modules/imports/data/queries.ts` — contacts-pattern shape. `getImportsPageData()` → `listImports`; `getImportDetailPageData(id)` → parallel `getImportDetailById` + `getImportFormOptions` (canonical warehouse + product + location options from `@builders/db`); `getImportCreatePageData()` → `getImportFormOptions`. All wrapped in `withPrismaConnectivityHandling` + `withLoaderTiming`.
- `apps/web/modules/imports/data/api.ts` — **deleted** after queries.ts is swapped. Its functions live in packages now.
- `apps/web/modules/imports/controllers/use-import-primary-section.ts` (MOVED from `record/panel/controllers/…`) — canonical types from `@builders/db` / `@builders/domain`; uses `updateImportRequest` in saveSection returning `serverValue: updated` for in-place reconciliation; wires `deleteRecord` → `deleteImportRequest(id, updatedAt)`.
- `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` (MOVED) — builds `ImportInventoryRowsDiff` client-side (add/modify/delete vs current server rows), calls `updateImportInventoryRowsRequest`, applies `tempIdMap` + `publishRecord(payload.importEntry)` in-place. No more whole-record PATCH.

### Files moved (`git mv`)
- `record/create/import-create-client.tsx` → `components/record/import-create-client.tsx`
- `record/detail/import-detail-client.tsx` → `components/record/import-detail-client.tsx`
- `record/panel/import-record-panel.tsx` → `components/record/import-record-panel.tsx`
- `record/panel/sections/import-primary-fields-section.tsx` → `components/record/import-primary-fields-section.tsx`
- `record/panel/sections/import-inventory-rows-section.tsx` → `components/record/import-inventory-rows-section.tsx`
- `record/panel/controllers/use-import-primary-section.ts` → `controllers/use-import-primary-section.ts`
- `record/panel/controllers/use-import-inventory-rows-section.ts` → `controllers/use-import-inventory-rows-section.ts`
- Remove empty `record/**` dirs.

### Files deleted
- `apps/web/modules/imports/domain/types.ts`, `summary.ts`, `contracts.ts`, `filters.ts` (filters may relocate inline into the list-client if it's just dashboard-page query state). `domain/` directory removed.
- Any root-level shims (`api.ts` re-export, `summary.ts` re-export, `table-filters.ts` at root if duplicated).
- `components/imports-client.tsx` (if shim).
- `components/list/imports-client.tsx` (if shim) — real client stays wherever it lives today; audit during execution.

### Type swaps across consumers
- `components/list/imports-client.tsx` + `imports-table.tsx` — use `ImportRecord` from `@builders/db`.
- `components/record/*` — use canonical `ImportDetailRecord`, `ImportInventoryRecord`, `ImportForm` (from domain), `CategoryRecord` / `WarehouseRecord` / `LocationRecord` (from db). UI that currently reads `location.locationCode` / `section.name` switches to `formatLocationLabel(rafter, level)` + `Section ${section.number}` — matches the warehouse sweep.
- Dashboard pages (`/dashboard/imports/page.tsx` + `[id]/page.tsx` + `new/page.tsx`) — update import paths and consume canonical record types.

### Inventory-table cross-reference
`modules/inventory/components/list/inventory-table.tsx` imports status/transport-type formatters from `@/modules/imports/domain/contracts`. That'll need the same import redirected to `@builders/domain` (now that the contracts live there). Small text swap; keeps inventory typechecking in the meantime.

### Verification gate
- `find apps/web/modules/imports -type f | sort` matches the canonical four-folder layout.
- `grep -rn "@/modules/imports/(domain|application|record)" apps/web` → zero.
- `grep -rn "@/modules/imports/" apps/web` → matches only under `components/list/`, `components/record/`, `controllers/`, `data/`.

---

## Phase 7 — Verify

### Checks
1. **Typecheck**: `npm run typecheck --workspace @builders/web 2>&1 | grep -c "error TS"`. Expect a **major drop from the current 66** — 12 of those errors live in `modules/imports/data/api.ts` + `modules/imports/application/import-entry.ts`, both deleted this sweep. Residuals should be only in inventory / cut-logs / work-orders / admin / shared panels.
2. **Regression greps** (source only, exclude `.next` + `dist` + `migrations_archive_*`):
   - `grep -rn "@/modules/imports/(domain|application|record)" apps/web` → zero.
   - `grep -rn "@/modules/imports/data/api" apps/web` → zero.
   - `grep -rn "locationCode" apps/web/modules/imports` → zero.
3. **Packages build**: `db`, `domain`, `application` all clean.
4. **Dev smoke**:
   - `/dashboard/imports` list renders; warehouse filter + status filter work.
   - `/dashboard/imports/new` create-returns-record (201) → redirect to detail using the id from the response (no refetch).
   - `/dashboard/imports/[id]` primary section: edit orderNumber/tag/status/transportType/warehouseId → save → record view reconciles inline (no navigation, no refetch).
   - Inventory-rows section: add a few rows → save → PATCH `/api/imports/:id/inventory-rows/section` with `{ added: [{tempId, ...}], modified: [], deleted: [] }` + mutation envelope; response returns canonical detail + tempIdMap; local state reconciled in place.
   - Edit an existing row's cost → save → `modified: [{ id, cost, expectedUpdatedAt }]`. Delete a row → `deleted: [{ id, expectedUpdatedAt }]`. Both flows update in place, no refetch.
   - Validation: create two rows with duplicate `(locationId, itemNumber)` → 409 with `IMPORT_INVENTORY_DIFF_VALIDATION_FAILED` and the row-level issue message.
   - Delete a PENDING import with no received inventory → 200, redirects to list. Delete a FINAL import → 409 `IMPORT_IN_USE`.
5. **Idempotency**: second POST with the same `idempotencyKey` returns the first response (replay), doesn't create a duplicate.

### Module shape final
```
apps/web/modules/imports/
├── components/
│   ├── list/    ← 2–3 files
│   └── record/  ← ~5 files
├── controllers/ ← 3 files
└── data/
    ├── mutations.ts
    └── queries.ts
```

No `domain/`, no `application/`, no `record/`, no root shims.

---

## Risk notes

1. **Delete-recreate → atomic diff is a behavior change.** Today, re-saving an import silently deletes all child inventory (losing any cut logs / allocations). With the atomic diff, modifying a single row preserves its id — cut logs and allocations remain linked. This is the correctness win, but any current users relying on "just re-save everything to reset" will see different behavior. Phase 4's `save-inventory-rows` documents this shift.
2. **`isImported` default = false.** Phase 1 adds the column with a default; existing inventory rows (if any — user confirmed disposable) become `isImported=false`. Domain rules that flip it to `true` (e.g., "when import status goes to FINAL, flip all rows") are **not included in this sweep**. Follow-up task. For now the boolean sits alongside the rows and the UI can show a status chip.
3. **Finalized-import delete block.** Domain rule proposed: block DELETE on FINAL-status imports, or imports with any `isImported=true` rows, or imports whose inventory has cut logs / work-order allocations. Phase 4's `delete-import` use case needs explicit decisions on which of these block vs. cascade. Default in this plan: **block on any of the above**. Flag if you want "FINAL + received = frozen" vs. "FINAL + cut logs = frozen, otherwise cascade".
4. **Inventory TS errors carry over.** `modules/inventory/data/api.ts` stays broken; wrapped defensively by `loadProductInventoryRowsSafely` in products sweep. For imports, inventory data is fetched via the new canonical `ImportDetailRecord.inventories` read — **no dependency on the stale inventory module**. So imports' dashboard detail page should render cleanly even before inventory sweep lands.
5. **Contracts cross-import.** `modules/inventory/components/list/inventory-table.tsx` consumes `formatImportStatus`, `formatTransportType`, etc. from imports' domain. After move to `@builders/domain`, that import redirects. One-line change; flagged here because it crosses module boundaries.
6. **`FIFO` + `fifoReceivedAt`.** The create path sets `fifoReceivedAt = importEntry.createdAt` for every child inventory row. Canonical write-repo preserves this. When rows are ADDED to an existing import via the diff save, they also receive `fifoReceivedAt = importEntry.createdAt` (not the time they were added) — so inventory-queue ordering remains consistent. This is a domain rule worth documenting explicitly in `import-rules.ts`.
7. **Route tool slug.** Currently imports uses `toolSlug: "warehouse"` (from the non-canonical `tool-slugs.ts` line). A dedicated `IMPORTS_TOOL_SLUG` would be more explicit but requires capability plumbing. This sweep keeps the existing slug to minimize blast radius; noted as a later cleanup.
8. **`importNumber` autoincrement vs. computeNextNumber.** Unlike warehouse (domain-computed via `computeNextNumber`), imports uses Postgres `autoincrement`. This is a schema-level difference that's working fine. No change needed. Noted so the pattern isn't unified accidentally during implementation.
