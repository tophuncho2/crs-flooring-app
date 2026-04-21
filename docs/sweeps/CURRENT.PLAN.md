# Current Plan — Imports · Inventory · Cut Logs Sweep

This plan executes layer-by-layer, module-by-module, across three interconnected modules: **imports**, **inventory**, **cut-logs**. Categories (seeded, read-only) is pulled in as a fourth passive participant because it owns the canonical UoM + unit-conversion logic that all three consume. **Work orders** is the sweep after that — referenced here only where it informs a shared shape that we set up now.

See `REFERENCE.md` for the full four-module vision (imports + inventory + cut-logs + work-orders). This plan is the narrowed, executable slice: ship imports + inventory + cut-logs end-to-end first, then pick up work-orders against the patterns established here.

---

## Progress

### Sweep 1 — Imports main section ✅ **COMPLETE**
Shipped in two passes. Status:

- ✅ **Database (Phase A):** no migration needed — `FlooringImportEntry` already has everything (`importNumber @unique @default(autoincrement())`, `warehouseId`, `status`, `transportType`, `notes`, `@@index([createdAt])`, `@@index([warehouseId])`).
- ✅ **Domain (Phase B):** `packages/domain/src/flooring/imports/` with `types.ts`, `import-rules.ts` (validateImportPrimaryForm, isImportDeleteBlocked, buildImportDeleteBlockedMessage), `summary.ts` (calculateImportSummary, calculateImportItemTotal — the canonical `totalCost` math), `filters.ts`, `index.ts`. Wired into `@builders/domain` root barrel.
- ✅ **Data (Phase C):** `packages/db/src/flooring/imports/` with `shared.ts` (selects + payloads), `read-repository.ts` (normalizers call `calculateImportSummary` from domain — never re-implement), `write-repository.ts` (`createImport`, `updateImport`, `deleteImportById`; each re-reads via `getImportById` so `totalCost` is accurate on return), `index.ts`. Aggregate query via `groupBy(importEntryId, _sum: { cost, freight })` powers list-view `totalCost`.
- ✅ **Application (Phase D):** `packages/application/src/flooring/imports/` with `create-import.ts`, `update-import.ts`, `delete-import.ts`, `errors.ts` (ImportExecutionError + codes), `types.ts`, `index.ts`. Each use case opens `withDatabaseTransaction`, validates via `@builders/domain`, throws typed ImportExecutionError, returns canonical `ImportRecord`.
- ✅ **Routes (Phase E):** section-per-file under `apps/web/app/api/imports/`:
  - `route.ts` — GET list + POST create
  - `[id]/route.ts` — GET detail + DELETE
  - `[id]/primary/section/route.ts` — PATCH primary section
  - `options/route.ts` — GET form options
  - `_validators.ts` — validateCreateImportInput, validateUpdateImportInput
  
  Full mutation lifecycle on every write (applyRoutePolicy → parseMutationEnvelope → assertExpectedUpdatedAt → enforceMutationReceipt → withMutationTelemetry → use case → finalizeMutationReceipt).
- ✅ **Module folder (Phase F):** `apps/web/modules/imports/` collapsed to canonical shape — `components/{list,record/{sections}}`, `controllers/`, `data/{queries,mutations}`. No legacy `domain/`, `application/`, `record/`, `data/api.ts`.
- ✅ **Computed `totalCost`:** source of truth in `calculateImportSummary` (domain). Surfaced on `ImportRecord` and `ImportDetailRecord` as `totalCost: number` + `totalCostLabel: string`. Displayed in the record view's primary fields section.
- ✅ **Allocation dead-code prerequisite:** `packages/application/src/flooring/work-orders/allocations/` deleted (was blocking builds with 55 errors referencing dropped DB models). Orphaned allocation tests + API routes also removed. Deeper cleanup (web-side allocation UI) stays paused until the work-orders sweep rebuilds the material-items flow against cut-logs.

**Verification state.** Packages build clean. Web TS error baseline unchanged at 115 (all in inventory, cut-logs, admin, shared engines — not imports).

### Sweep 2 — Inventory + imports record-view's inventory-rows section ⏭️ **NEXT**
Scope detailed below in §"Next sweep."

### Sweep 3 — Cut logs + computed balances
Scope referenced in §"After inventory."

### Sweep 4 — Work orders
Scope referenced in §"After cut logs."

---

## Strict layering (non-negotiable, every module)

| Layer | Path | Responsibility | Forbidden |
|---|---|---|---|
| Domain | `packages/domain/src/flooring/{module}/` | Pure types, diff shapes, rules, formatters, errors. | **No I/O.** No Prisma, no fetch, no DB client. |
| Application | `packages/application/src/flooring/{module}/` | Use cases. Orchestrate domain rules + db reads/writes. Own transactions. | No HTTP. No domain re-implementation. |
| Data | `packages/db/src/flooring/{module}/` | Canonical read + write repositories per module. Normalizers feed domain helpers. | No business logic. No conditional domain rules. |
| App module | `apps/web/modules/{module}/` | `controllers/`, `components/{list,record/{section}}/`, `data/{queries.ts, mutations.ts}`. | No domain logic. No application logic. No direct Prisma. |
| Routes | `apps/web/app/api/{module}/` | One mutation route per section. Each route calls exactly one use case. | No business logic. No direct Prisma. |
| Dashboard | `apps/web/app/dashboard/{module}/` | SSR page loaders; import only from `modules/{module}/data/queries.ts`. | No direct Prisma. No domain/application imports. |

---

## Cross-module use-case placement — canonical rule

When a save originates from one module's record view but writes another module's rows (e.g., saving inventory rows from the imports record view), follow this split:

- **Domain rules** (validators, diff types, invariants) live with the data model they describe. Inventory rules in `packages/domain/src/flooring/inventory/`, cut-log rules in `packages/domain/src/flooring/cut-logs/`. Consumers import from there — never duplicate. **One source of truth.**
- **Single-row DB reads/writes** live with the data model. Inventory single-row CRUD in `packages/db/src/flooring/inventory/`, cut-log single-row CRUD in `packages/db/src/flooring/cut-logs/`.
- **Atomic-diff DB primitives** are scoped by their **parent context**, since they're transactional boundaries on the parent's child set. `applyImportInventoryRowsDiff(tx, input)` lives in `packages/db/src/flooring/imports/` — the diff is scoped to a specific import. `applyInventoryCutLogsDiff` lives in `packages/db/src/flooring/inventory/` — scoped to a specific inventory row.
- **Use cases** are placed by the parent context of the save. `saveImportInventoryRowsUseCase` lives in `packages/application/src/flooring/imports/` (parent is the import). `saveInventoryCutLogsUseCase` lives in `packages/application/src/flooring/inventory/` (parent is the inventory row). Each use case imports domain rules from multiple domain namespaces as needed.
- **Routes** mirror their use case's home. `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` calls `saveImportInventoryRowsUseCase` from `@builders/application`. `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` calls `saveInventoryCutLogsUseCase`.

**The payoff.** Domain + data primitives are unique — no duplicated rules. Use-case orchestration is lightweight (validate + apply + re-read), so co-locating it with the parent context is cheap and keeps the record-view story coherent.

---

## End-state module directory shape (target for every swept module)

```
apps/web/modules/{module}/
├── components/
│   ├── list/                       — list-view (table, filters, columns, toolbar)
│   └── record/
│       ├── {section-a}/            — one folder per section
│       └── {section-b}/
├── controllers/
│   ├── use-{module}-list-controller.ts
│   ├── use-{module}-primary-section.ts
│   └── use-{module}-{child-section}-section.ts
└── data/
    ├── queries.ts                  — thin wrappers over @builders/db canonical reads
    └── mutations.ts                — client POST/PATCH/DELETE helpers (withMutationMeta)
```

- **`data/queries.ts`** is a thin wrapper — no Prisma imports, no direct DB — just re-exports / typed calls into `@builders/db`.
- **`data/mutations.ts`** wraps every write the module can initiate (one helper per section-save route + create/delete).
- **No legacy** `domain/`, `application/`, `record/`, or `data/api.ts`.

From this sweep forward, this is the canonical module directory layout. Earlier modules (warehouses, products, contacts) retro-fit lazily when next touched.

---

## Route shape (section-per-file)

```
apps/web/app/api/{module}/
├── _validators.ts                            — per-module input validators
├── route.ts                                  — GET list + POST create
├── options/route.ts                          — GET form options
└── [id]/
    ├── route.ts                              — GET detail + DELETE
    ├── primary/section/route.ts              — PATCH primary section (record-level fields)
    └── {child-section}/section/route.ts      — PATCH atomic diff for the child section
```

### Standard mutation lifecycle per route

```
applyRoutePolicy(toolSlug, rateScope)
  → parseMutationEnvelope(body, validator, { requireExpectedUpdatedAt: PATCH | DELETE })
  → snapshot via getXById + assertExpectedUpdatedAt (PATCH | DELETE)
  → enforceMutationReceipt(idempotencyKey)
  → withMutationTelemetry(() => useCase(...))
  → finalizeMutationReceipt
  → routeJson(canonicalResponse)
```

**Response shape.** Primary + create + delete return the canonical Record. Atomic-diff saves return `{ parent: CanonicalDetailRecord, tempIdMap }` so the client reconciles temp → real ids in place without refetching.

---

## Per-section save model — rules

1. **Own controller.** Each section owns a hook in `controllers/` that builds its diff client-side, calls its mutation helper in `data/mutations.ts`, and reconciles the response in place.
2. **Own route.** Each section has one PATCH file under `[id]/{section-name}/section/route.ts`. Route calls one use case.
3. **Own use case.** Each section's use case opens its own `withDatabaseTransaction`, decides its lock set, validates via domain, applies via db write primitive, re-reads, returns canonical.
4. **Own lock scope.** Each section locks only what it writes. See the lock matrix below.
5. **Per-row `expectedUpdatedAt`** on every modified / deleted diff entry. Envelope-level `expectedUpdatedAt` on the parent detects gross concurrent failure (record deleted mid-edit) but is a plain read, not a lock.
6. **Atomic diff with tempIds.** New rows carry a client-generated `tempId`. Use case assigns real uuids, returns `tempIdMap` so the client reconciles temp → real ids in place. Domain owns the tempId identity contract (e.g., `packages/domain/src/flooring/inventory/diff-identity.ts`, mirroring warehouses).

### Lock scope matrix

| Section-save | Row(s) locked | Row(s) NOT locked |
|---|---|---|
| Imports — primary section ✅ | `flooring_import_entry` for this id (FOR UPDATE) | Inventory rows, nothing else |
| Imports — inventory-rows section ⏭️ | `flooring_import_entry` (parent) FOR UPDATE + touched inventory rows (modified/deleted ids) | Cut logs, other imports |
| Inventory — primary section ⏭️ | `flooring_inventory` for this id FOR UPDATE | Cut logs, parent import |
| Inventory — cut-logs section | `flooring_inventory` (parent) FOR UPDATE + touched `flooring_cut_log` rows | Work orders, material items, other inventory rows |
| Cut log — standalone save | The single `flooring_cut_log` row FOR UPDATE + its parent `flooring_inventory` FOR UPDATE | Work orders, material items |

**Cross-category lock order** (when multiple categories locked in one transaction): `flooring_inventory` → `flooring_cut_log` → (future: `flooring_work_order_item`). Within each category, sort by `id`. Fixed order prevents deadlock.

---

## Next sweep — Inventory + imports' inventory-rows section

This sweep ships two things together because they share the same diff primitive and domain rules:

1. **Inventory module** — full stack (DB, domain, application, routes, module folder, dashboard pages) for standalone inventory CRUD + the cut-logs section that will arrive in sweep 3.
2. **Imports record view's inventory-rows section** — the atomic-diff save that lets users add/edit/delete inventory rows directly from an import record.

### Phase A — Database

Single migration. Per REFERENCE.md:

- `FlooringInventory`:
  - add `warehouseId String?` + relation to `FlooringWarehouse` (`onDelete: SetNull`) + `@@index([warehouseId])`.
  - add `isImported Boolean @default(false)` (gate for cut-log creation, wired in sweep 3).
  - drop `reservedStockCount` (dead after allocation retirement; superseded by `awaitingCutBalance` computed in sweep 3).
- No changes to `FlooringCutLog` this sweep (cut-log `status` added in sweep 3).

Verification: `prisma migrate status` clean; `@builders/db` builds.

### Phase B — Domain (`packages/domain/src/flooring/inventory/`)

New folder. Canonical home for inventory rules, diff types, and diff identity.

Files:

| File | Exports |
|---|---|
| `types.ts` | `InventoryRow` canonical shape (with `warehouseId`, `isImported`, no `reservedStockCount`; includes computed fields surface for sweep 3 — `physicalStock`, `availableCoverage`, `awaitingCutBalance`, `totalCutBalance` — populated by db normalizer but typed here). `InventoryForm`, `EMPTY_INVENTORY_FORM`, `toInventoryForm`. `InventoryDetail = InventoryRow & { cutLogs: CutLogRow[] }` (sweep 3 wires cut-log read-through). |
| `inventory-rules.ts` | `validateInventoryInput` — structural + `warehouseId` required when a location is chosen, `stockCount >= 0`, `assertLocationBelongsToWarehouse(location, warehouseId)`. `isInventoryDeleteBlocked(counts)` — blocks if any cut logs reference it. `buildInventoryDeleteBlockedMessage`. `canAddCutLog(inventory)` returns `inventory.isImported === true` (used by sweep 3 cut-log save). |
| `diff-types.ts` | `InventoryRowDraft`, `InventoryRowUpdate`, `InventoryRowDelete`, `InventoryRowsDiff`, `DiffValidationIssue` variants (`DUPLICATE_ITEM_NUMBER_PER_LOCATION`, `LOCATION_WAREHOUSE_MISMATCH`, `IMPORT_WAREHOUSE_MISMATCH`, `UNKNOWN_PRODUCT`, `UNKNOWN_LOCATION`), `validateInventoryRowsDiff(diff, existing, parentContext)`, `describeInventoryRowsDiffIssue(issue)`. |
| `diff-identity.ts` | TempId → real-id map utilities, mirroring `packages/domain/src/flooring/warehouses/diff-identity.ts`. |
| `formatters.ts` | Migrate inventory formatters from `apps/web/modules/inventory/domain/formatters.ts` (current module-local file). Includes `formatFullLocationCode({ warehouseNumber, sectionNumber, rafter, level })` → `"W{n}-S{n}-R{n}-L{n}"` (replaces the stale `locationCode` column that was dropped; used by the db normalizer + list/record views). |
| `index.ts` | Barrel. |

Wire into `packages/domain/src/index.ts`.

### Phase C — Data (`packages/db/src/flooring/inventory/` + extensions to imports DB)

**`packages/db/src/flooring/inventory/`** (new):

- `shared.ts` — `inventoryRowSelect` (product + category + location + warehouse + `_count.cutLogs`), `inventoryDetailSelect` (adds cut-logs relation — typed now, read-through in sweep 3), payload types, `InventoryDbClient`.
- `read-repository.ts` — `InventoryRecord`, `InventoryDetailRecord`, normalizers (compute `locationCode` via `formatFullLocationCode`), `listInventory`, `getInventoryById`, `getInventoryDetailById`, `getInventoryDeleteState` → `{ hasCutLogs: boolean }`, `listInventoryOptions` (products, warehouses, locations filtered by warehouse).
- `write-repository.ts` — `CreateInventoryInput`, `UpdateInventoryInput`, `createInventory`, `updateInventory`, `deleteInventoryById`. Single-row writes only — diff primitive lives under imports.
- `index.ts` — barrel.

**`packages/db/src/flooring/imports/` extensions** (existing folder):

- Add `applyImportInventoryRowsDiff(tx, input) → { rows: InventoryRecord[], tempIdMap }`. Scoped by import parent (applies to a single import's inventory row set). Per REFERENCE.md §Phase C: added, modified, deleted row handling; resolves tempIds → real uuids; sets `fifoReceivedAt = importEntry.createdAt` on added rows; sets `warehouseId` from the resolved location's warehouse (source-of-truth rule). Returns normalized rows + the tempIdMap.

Wire both into `packages/db/src/index.ts`.

### Phase D — Application (use cases split by parent context)

**`packages/application/src/flooring/inventory/`** (new):

- `create-inventory.ts` — `createInventoryUseCase(input, client?)`. Validates via domain, checks warehouse + location existence, inserts, returns canonical `InventoryRecord`.
- `update-inventory.ts` — `updateInventoryUseCase(id, input, client?)`. Validates, updates, re-reads, returns canonical.
- `delete-inventory.ts` — `deleteInventoryUseCase(id, client?)`. Uses `getInventoryDeleteState` + `isInventoryDeleteBlocked`; throws `InventoryExecutionError("INVENTORY_IN_USE")` if cut logs reference it.
- `errors.ts` — `InventoryExecutionError` + code union (`INVENTORY_NOT_FOUND`, `INVENTORY_IN_USE`, `INVENTORY_VALIDATION_FAILED`, `INVENTORY_LOCATION_WAREHOUSE_MISMATCH`, `INVENTORY_WAREHOUSE_NOT_FOUND`, `INVENTORY_LOCATION_NOT_FOUND`, plus sweep-3 codes reserved: `CUT_LOG_INVENTORY_NOT_IMPORTED`, `CUT_LOG_EXCEEDS_STARTING_BALANCE`).
- `types.ts`, `index.ts` — types + barrel.

**`packages/application/src/flooring/imports/`** (existing folder, add):

- `save-inventory-rows.ts` — `saveImportInventoryRowsUseCase(id, diff, client?)`:
  1. `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — lock parent.
  2. Refuse if import `status === "FINAL"` (immutable). Throw typed error.
  3. Load current inventory rows for this import; resolve warehouse + locations referenced by the diff.
  4. Validate via `validateInventoryRowsDiff(diff, existing, { kind: "import", warehouseId: importEntry.warehouseId })`.
  5. Assign `tempId → uuid`; on added rows set `fifoReceivedAt = importEntry.createdAt`, set `warehouseId` from the resolved location (source of truth). Per-row `expectedUpdatedAt` is checked against current state for modified / deleted entries.
  6. Call `applyImportInventoryRowsDiff(tx, input)`.
  7. Re-read the import detail (now includes updated inventory rows). Return `{ importEntry: ImportDetailRecord, tempIdMap }`.

Imports from `@builders/domain/flooring/inventory` (diff validation, identity). Uses `@builders/db/flooring/imports` primitives. No inventory-domain logic duplicated.

### Phase E — Routes

**New inventory routes** under `apps/web/app/api/inventory/`:

```
_validators.ts
route.ts                           — GET list + POST create
options/route.ts                   — GET form options
[id]/route.ts                      — GET detail + DELETE
[id]/primary/section/route.ts      — PATCH primary
```

**New imports inventory-rows route** under `apps/web/app/api/imports/`:

```
[id]/inventory-rows/section/route.ts   — PATCH atomic diff (calls saveImportInventoryRowsUseCase)
```

Rate scopes: `imports.inventory-rows.section.replace`, `inventory.create`, `inventory.primary.section.replace`, `inventory.delete`, etc. Standard lifecycle per route.

### Phase F — App modules

**`apps/web/modules/inventory/`** — collapse to canonical shape (mirrors the imports restructure):

- `components/{list,record/{sections}}`
- `controllers/{use-inventory-list-controller,use-inventory-primary-section,use-inventory-cut-logs-section}.ts` (cut-logs controller is a shell this sweep; gets its save wired in sweep 3).
- `data/{queries,mutations}.ts` — thin `@builders/db` wrappers + client mutation helpers. 4 mutation helpers: `createInventoryRequest`, `updateInventoryRequest`, `deleteInventoryRequest`, `updateInventoryCutLogsRequest` (wired in sweep 3).
- Delete `modules/inventory/{domain,application,record}/`, `data/api.ts`, any root-level shims. Existing module-local `domain/formatters.ts` content migrates to `@builders/domain/flooring/inventory/formatters.ts`.

**`apps/web/modules/imports/`** — add the inventory-rows section wiring (no folder restructure, since imports is already canonical):

- `controllers/use-import-inventory-rows-section.ts` — rewrite to build `ImportInventoryRowsDiff` client-side (add/modify/delete with tempIds), call `updateImportInventoryRowsRequest` from mutations. Currently posts to the now-removed combined PATCH endpoint — wire it to the new section route.
- `data/mutations.ts` — add `updateImportInventoryRowsRequest(importId, diff, revisionKey)`.
- `components/record/sections/import-inventory-rows-section.tsx` — already present; its grid continues to work against the drafts types, just gets saved differently.

### Phase G — Dashboard pages + verification

- `apps/web/app/dashboard/inventory/{page,[id]/page,new/page}.tsx` — rewire to `modules/inventory/data/queries.ts` (thin wrappers only). No direct Prisma. Remove server pagination in favor of canonical load-all (matches contacts / warehouses).
- `apps/web/app/dashboard/imports/[id]/page.tsx` — no changes needed (already consumes `ImportDetailRecord`).

**Verification gates:**
- `@builders/{domain,db,application}` build clean.
- Regression greps: `grep -rn "@/modules/inventory/(domain|application|record)" apps/web` → zero. `grep -rn "reservedStockCount" apps packages` → zero. `grep -rn "locationCode" packages/db/prisma` → zero (column dropped from schema during warehouse sweep; `formatFullLocationCode` domain helper replaces).
- Dev smoke:
  - **Inventory module:** list → new (warehouse → location dropdown filtered correctly) → detail → primary save → flip `isImported` to true → delete blocked once cut logs exist (sweep 3 enables the other side).
  - **Imports' inventory-rows section:** on an import detail page, add rows (atomic diff with tempIds → real ids in response) → edit a row's cost (modified diff) → delete a row (deleted diff) → warehouse mismatch rejected → duplicate itemNumber at same location rejected → import's `totalCost` updates correctly after each save.
  - **Cross-lock test:** concurrent primary-section + inventory-rows saves on the same import serialize cleanly (both need the import-entry row lock for rows; primary saves only the entry).

---

## After inventory — Sweep 3 — Cut logs + computed balances

Scope (from REFERENCE.md):

- **Database:** add `FlooringCutLog.status String @default("PENDING")` (closed set `PENDING` | `FINAL`).
- **Categories domain** (`packages/domain/src/flooring/categories/unit-conversion.ts`): canonical unit-conversion helpers — `computePhysicalStock`, `computeAwaitingCutBalance`, `computeTotalCutBalance`, `computeAvailableCoverage`, `convertStockToSend`, `computeStockRequiredForQuantity`, `isItemFulfilled`. Single source of truth; consumed by inventory + work-orders db normalizers.
- **Cut-logs domain** (`packages/domain/src/flooring/cut-logs/`): types with status enum, `CutLogsDiff` with parent-context, `before − cut = after` invariant, link-shape rule (`workOrderId → workOrderItemId required`), errors.
- **Inventory DB normalizer:** compute + surface `physicalStock`, `availableCoverage`, `awaitingCutBalance`, `totalCutBalance` on every read. List view uses scalar SQL aggregates; detail view relation-loads cut logs.
- **Inventory application:** `save-cut-logs.ts` — `saveInventoryCutLogsUseCase(inventoryId, diff, client?)` with narrow lock scope (inventory row + touched cut-log rows); enforces `canAddCutLog(inventory)` + `physicalStock >= 0`.
- **Cut-logs DB** (`packages/db/src/flooring/cut-logs/`): single-row CRUD (`createCutLog`, `updateCutLog`, `deleteCutLogById`, `getCutLogById`, `listCutLogsByInventory`). Cost normalizer: `cut × inventory.unitCost`. `applyInventoryCutLogsDiff` lives under inventory DB (parent-scoped).
- **Routes:** `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts`; no top-level cut-logs routes.
- **Module:** `apps/web/modules/cut-logs/` — thin; keep shared render helpers (cut-log row component used by inventory's cut-logs section, later by work-orders' items-section).

Verification: record view shows `availableCoverage` in `coverageAvailableUnit` (e.g., sqft for vinyl-plank), `physicalStock` / `awaitingCutBalance` / `totalCutBalance` all reconcile after each cut-log save.

---

## After cut logs — Sweep 4 — Work orders

Lands the final module against all the patterns established in sweeps 1–3.

- **Database cleanup:** drop `FlooringWorkOrderItemAllocation` + `FlooringWorkOrderAllocationRun` + related enums (already mostly dropped from DB; `FlooringWorkOrderItem.allocationStatus` + `changeOrderStatus` columns drop); keep `FlooringChangeOrderStatus` enum as the TS type for computed `fulfillmentStatus`.
- **Domain:** work-orders types + rules; `fulfillment-status.ts` uses categories unit-conversion to compute `SHORTAGE` | `SUFFICIENT` per item + all-or-nothing aggregate per work order. Material items' diff includes nested cut-log children per item.
- **Data:** atomic-diff primitives `applyWorkOrderMaterialItemsDiff` (nested cut-log children in one transaction), `applyWorkOrderServiceItemsDiff`, `applyWorkOrderSalesRepsDiff`. Single-row repos for each child.
- **Application:** `create-work-order`, `update-work-order`, `delete-work-order`, `save-material-items` (narrow-lock: inventory rows touched + cut-log rows + material-item rows; fixed lock-category order inventory → cut-logs → items), `save-service-items` (single-category lock), `save-sales-reps`.
- **Routes:** section-per-file for each child. Delete allocation-specific routes + `[id]/auto-allocation`, `[id]/reconciliation`, `[id]/allocation-options`, `[id]/items/[itemId]/allocations/**`. Update `[id]/sync-template` to write via new primitives.
- **Modules:** collapse `apps/web/modules/work-orders/` to canonical shape. Delete `modules/work-orders/{domain,application,record,transport}/`, `allocation-errors.ts`, `allocations.ts`, `mutations.ts` allocation blocks. Replace `material-allocations-editor.tsx` with a material-items-with-cut-logs grid. Delete `useRecordAllocationController`, `RecordAllocationRowBuilder`, `use-work-order-auto-allocation-workflow`, remaining allocation-route files and tests.

---

## Cross-cutting rules (carried from REFERENCE.md)

- **Idempotency.** Every mutation carries an `idempotencyKey`; `enforceMutationReceipt` + `finalizeMutationReceipt` bracket the use case. Retrying the same key returns the prior response.
- **Transactional.** Use cases own `withDatabaseTransaction`. All DB writes inside one transaction. Fresh reads under locks, never pre-lock snapshots.
- **Rate limited.** Per-route scope string. Applied via `applyRoutePolicy`.
- **Route policy.** `applyRoutePolicy(toolSlug, scope)` is the entry gate for every API route.
- **Expected-updated-at.** Envelope-level against parent record for PATCH / DELETE. Per-row on every modified / deleted diff entry.
- **Canonical response.** Every write returns a canonical Record (or `{ parent, tempIdMap }` for atomic diffs). No refetch on any save path.

---

## Phase order — one-line summary

**Sweep 1 (done):** Imports main section — DB → Domain → Data → Application → Routes → Module cleanup → Verify. ✅
**Sweep 2 (next):** Inventory module + imports' inventory-rows section — shared migration, shared domain, split use-case homes by parent context.
**Sweep 3:** Cut logs + computed balances (inventory `physicalStock`, `availableCoverage`, `awaitingCutBalance`, `totalCutBalance` via categories unit-conversion).
**Sweep 4:** Work orders against the established patterns; retires the allocation model entirely.
