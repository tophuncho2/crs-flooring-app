# Canonical Sweep — Imports · Inventory · Cut Logs · Work Orders

One coordinated sweep across four interconnected modules. Executed **layer-by-layer across all four modules**: finish each layer for every module before moving to the next. Imports, inventory, and cut-log schemas are linked; work orders consume inventory via cut logs; doing them separately would mean three schema migrations and repeated UI churn. One pass, one schema change, one verification.

Completed in prior sweeps (reference, not redone): Warehouse (3 phases), Products (7 phases).

---

## Strict layering (non-negotiable for every module)

- **`packages/domain/src/flooring/{module}/`** — all business rules, types, diff shapes, computed formulas, unit-conversion rules, errors. Pure. No I/O. Every rule is canonical here; consumers never re-implement.
- **`packages/application/src/flooring/{module}/`** — use cases. Orchestrate domain rules + data reads/writes. Own transactions. No HTTP.
- **`packages/db/src/flooring/{module}/`** — read + write repositories. Persistence only. No business logic. Each repo normalizes rows into the canonical Record shape returned to use cases.
- **`apps/web/modules/{module}/`** — `controllers/`, `components/{list,record}/`, `data/{mutations,queries}.ts`. No domain/application logic. No direct Prisma. Client mutations wrap `withMutationMeta`; queries wrap `@builders/db` canonical reads.
- **`apps/web/app/api/{module}/`** — routes. Each mutation route calls ONE use case. `_validators.ts` at the route edge. Full mutation lifecycle (`applyRoutePolicy` + rate limit + `parseMutationEnvelope` + `assertExpectedUpdatedAt` + `enforceMutationReceipt` + `withMutationTelemetry` + `finalizeMutationReceipt`). No business logic.
- **`apps/web/app/dashboard/{module}/`** — pages import from `modules/{module}/data/queries.ts`. SSR loaders only.

### Routes per module (section-per-file)

Every module follows the same route shape. **Each section within a record view gets its own save route.**

- `route.ts` — GET list (via `@builders/db::list{Module}`) + POST create (via `create{Module}UseCase`)
- `[id]/primary/section/route.ts` — PATCH primary-section replace (via `update{Module}UseCase`). Main-section canonical.
- `[id]/{section-name}/section/route.ts` — PATCH atomic diff for each child grid section. One file per section. Diff body uses **tempIds for new rows** and `expectedUpdatedAt` per modified/deleted row. Response returns `{ parent: Canonical{Module}DetailRecord, tempIdMap }` so the client reconciles temp → real ids in place.
- `[id]/route.ts` — DELETE (via `delete{Module}UseCase`).
- `options/route.ts` — GET form options (via `@builders/db`).

---

## Scope map

| Module | Main section | Child sections | Owns schema | Dashboard page |
|---|---|---|---|---|
| **Imports** | Import primary (orderNumber, tag, transportType, status, warehouseId, notes) | Inventory rows (atomic diff) | `FlooringImportEntry` | list + detail + new |
| **Inventory** | Inventory row primary (product, location, stock, cost, freight, dye lot, isImported, notes) | Cut logs (atomic diff) | `FlooringInventory` | list + detail + new |
| **Cut Logs** | (no standalone) | — | `FlooringCutLog` | none — only surfaces via inventory record view (and later work-orders record view) |
| **Work Orders** | Work-order primary (propertyId, templateId, warehouseId, status, vacancy, scheduledFor, unitLabel/type, instructions, notes) | Material items (with cut-log children), service items, sales reps — all atomic diffs | `FlooringWorkOrder`, `FlooringWorkOrderItem`, `FlooringWorkOrderServiceItem`, `FlooringWorkOrderSalesRep` | list + detail + new |

### Schema changes in one migration
1. `FlooringInventory.warehouseId String?` + relation to `FlooringWarehouse` (onDelete: `SetNull`). **Source of truth** for the inventory row's warehouse. Import's `warehouseId` + location's `warehouseId` are consistency checks only; inventory's `warehouseId` is authoritative.
2. `FlooringInventory.isImported Boolean @default(false)`. Per-row "received into warehouse" flag. **Gate on cut logs**: an inventory row with `isImported=false` is ineligible for cut-log creation — use case rejects. Import-level `status: "PENDING" | "FINAL"` stays for UI display only this sweep (no behavior wired).
3. **Drop `FlooringInventory.reservedStockCount`.** Dead field (previously written by allocation runner). No replacement stored — reserved-equivalent is now `awaitingCut` (computed from cut-log diffs, see below).
4. `FlooringCutLog.status String`. Free-form with closed domain values `"PENDING"` / `"FINAL"`. Default `"PENDING"` via Prisma `@default("PENDING")`. Domain-validated; DB enum deferred (matches import-status pattern for now).
5. **Drop `FlooringWorkOrderItemAllocation` entirely.** Drop `allocations` relations on `FlooringInventory` and `FlooringWorkOrderItem`. Drop `FlooringWorkOrderAllocationRun` (auto-allocation is deferred; see Out of Scope). Drop `FlooringWorkOrderAllocationRunStatus` enum. Drop `FlooringAllocationMethod` enum if orphaned.
6. **Drop `FlooringWorkOrderItem.allocationStatus` column + `FlooringWorkOrderItemAllocationStatus` enum entirely.** Fulfillment status is computed on read, never stored. The 4-value enum was scaffolding for the old allocation runner; binary is enough now.
7. **Drop `FlooringWorkOrderItem.changeOrderStatus` column.** "Change order" vocabulary is retired — the concept collapses into the same computed fulfillment status as material items (is this item covered by its cut logs?). Keep the enum `FlooringChangeOrderStatus { SHORTAGE, SUFFICIENT }` itself since it's the TypeScript type for the computed `fulfillmentStatus` values surfaced by the read-repo normalizer — but nothing stores it on any column after this sweep.
8. Material-item ↔ cut-log link already exists via `FlooringCutLog.workOrderItemId`. No new column needed. `FlooringCutLog.workOrderId` stays too. When a cut log is created from the work-order record view, both must be set (plus `inventoryId`). When created from the inventory record view, `workOrderId` + `workOrderItemId` are optional — the user picks via cascading dropdown (below).

### Inventory computed fields (not stored on schema — derived in domain)

The schema stores only primary facts (`stockCount` = starting balance at import time, plus product/location/warehouse refs and `isImported`). Everything else is computed on read. Domain helpers in `packages/domain/src/flooring/inventory/`:

- `stockAvailable = stockCount − sum(cutLogs.cut)` — single source of truth for "what's physically left on this row", in the product category's **stock unit** (e.g., boxes). Counts cuts regardless of status (a cut has happened whether or not it's been finalized).
- `awaitingCut = sum(cutLogs.cut where status === "PENDING")` — how much of the total cuts are still awaiting confirmation, in the stock unit. When a cut-log flips PENDING → FINAL, `awaitingCut` drops; `stockAvailable` does not change.
- `locationCode = "W{warehouse.number}-S{section.number}-R{location.rafter}-L{location.level}"` — display-only composite, computed by `formatFullLocationCode(...)` in `@builders/domain`. No longer stored; read queries `include` all four parts.
- **`coverageAvailable = stockAvailable × product.coveragePerUnit`** — **priority, in scope this sweep**. Translates from stock unit (e.g., boxes) to coverage unit (e.g., sqft) using the product's `coveragePerUnit` multiplier defined at the product level. Displayed on inventory list + record view. See unit-conversion rules below.

### Category-driven unit conversion (in-scope domain rules)

Categories and unit-of-measures are **seeded** and read-only. They provide the mapping between a product's stock unit, send unit, and coverage unit. The seeded vinyl-plank category is the canonical shape:

| Category field | Seeded UoM | What it governs |
|---|---|---|
| `stockUnit` | Boxes | Inventory `stockCount` + `stockAvailable` + `cutLogs.cut` are all in this unit |
| `sendUnit` | Square Feet | Work-order material-item `quantity` is in this unit |
| `coverageAvailableUnit` | Square Feet | `coverageAvailable` (computed) is in this unit |
| `itemCoverageUnit` | Square Feet | `product.coveragePerUnit`'s unit (e.g., 23.77 sqft per box) |
| `serviceUnit` | — | Service-item pricing unit |

**Conversion rules live in `packages/domain/src/flooring/inventory/unit-conversion.ts`**, keyed by category slug. Each rule declares whether the stock unit can split (decimals allowed) and the rounding direction when it can't.

```ts
export type CategoryUnitRule = { canSplit: boolean; rounding: "up" | "down" | "nearest" | "exact" }
export const CATEGORY_UNIT_RULES: Record<string, CategoryUnitRule> = {
  "vinyl-plank": { canSplit: false, rounding: "up" }, // boxes, whole, round up
}
```

Core helpers (all pure):
- `computeCoverageAvailable({ stockAvailable, coveragePerUnit }) → number` — `stockAvailable × coveragePerUnit`, in the category's coverage unit.
- `computeStockRequiredForQuantity({ quantityInSendUnit, coveragePerUnit, categorySlug }) → number` — inverse. `ceil(quantity / coveragePerUnit)` for vinyl-plank; other categories plug in their rules. Used by work-order UI to suggest how many boxes cover `N` sqft.
- `isItemFulfilled({ quantityInSendUnit, cutLogsCutTotal, coveragePerUnit }) → boolean` — `cutLogsCutTotal × coveragePerUnit ≥ quantityInSendUnit`. **Overage allowed** (a cut bigger than requested is fine; never restricted).
- `computeItemFulfillmentStatus(...)` → returns `"SUFFICIENT"` or `"SHORTAGE"` via the above predicate.
- `computeWorkOrderFulfillmentStatus(items)` → aggregate, all-or-nothing. Every item `SUFFICIENT` → `SUFFICIENT`; any item `SHORTAGE` → `SHORTAGE`.
- `formatFulfillmentStatus(status)` → display label `"Short"` / `"Assigned"`.

Rules extend as new categories get seeded. Categories and UoMs themselves are NOT edited by this sweep — we consume what they already provide.

### Invariants enforced at the application layer (not DB)

**Warehouse / location:**
- `inventory.warehouseId === location.warehouseId` when both are present. Warehouse is chosen first; locations dropdown is filtered to `listLocationsByWarehouse(warehouseId)`. Sections are **referenced transitively** through the chosen location (location → section → warehouse); no direct `sectionId` column on inventory.
- Changing `warehouseId` on an inventory row clears `locationId` if the current location isn't in the new warehouse. The UI nudges the user to pick a new location; the use case doesn't silently try to remap.
- `inventory.warehouseId === importEntry.warehouseId` when both are present. On import's inventory-rows section: the warehouse selector is **not shown per row** — rows inherit the import's warehouseId. The row's warehouseId is only editable from the inventory record view, standalone.

**Cut logs:**
- **Eligibility gate**: `canAddCutLog(inventory) = inventory.isImported === true`. Use case rejects `CUT_LOG_INVENTORY_NOT_IMPORTED` if false. Existing cut logs on a row whose `isImported` later flips back to `false` are preserved (no cascade); only new cuts are blocked.
- **Arithmetic invariant**: `before − cut === after` per row. Enforced at domain.
- **Starting-balance invariant**: `sum(cutLogs.cut) ≤ inventory.stockCount` at all times. Equivalently `stockAvailable ≥ 0`. Enforced at domain during cut-log save.
- **Link requirements when saving from work-order record view**: cut log must carry all three of `{ inventoryId, workOrderId, workOrderItemId }`. Default-linked on create the same way import inventory rows default-link to the import's warehouse.
- **Link requirements when saving from inventory record view**: `inventoryId` is required; `workOrderId` + `workOrderItemId` are optional. If the user wants to link, they use the cascading dropdown in the inventory record view's cut-logs section (below).
- **Cascading dropdown behavior — inventory record view cut-logs section**:
  1. Material-item dropdown is **disabled** until a work order is picked.
  2. After picking a work order, the material-item dropdown filters to: items on that work order whose `productId === inventory.productId`.
  3. If no matching items, the dropdown shows an empty state ("No material items on this work order use this product"). The cut log can still save without a material-item link.
- A cut log's `workOrderItemId` (if set) must belong to a work order that scopes the same warehouse as the cut log's inventory row.

**Material items / work order fulfillment:**
- `item.fulfillmentStatus = isItemFulfilled({ quantity, cutLogsCutTotal, coveragePerUnit }) ? "SUFFICIENT" : "SHORTAGE"`. Computed on every read; never stored.
- `workOrder.fulfillmentStatus = all items SUFFICIENT ? "SUFFICIENT" : "SHORTAGE"`. Computed on read.
- **Overage allowed**: `cutLogsCutTotal × coveragePerUnit > quantity` is valid (never rejected). A job that needs 100 sqft can have a cut log supplying 120 sqft.
- UI labels: `"Short"` (SHORTAGE) / `"Assigned"` (SUFFICIENT).

---

## Execution order

Finish each layer for all four modules before moving to the next:

- **Phase A — Prisma** (schema + single migration covering all eight changes above)
- **Phase B — `packages/domain/`** (types, rules, diff shapes, errors per module)
- **Phase C — `packages/application/`** (use cases per module; each imports domain rules)
- **Phase D — Routes** (`_validators.ts` + split files per section per module)
- **Phase E — Dashboard pages** (page loaders wire to module `data/queries.ts`)
- **Phase F — Module slim** (flatten `record/` → `components/{list,record}/`, wire `controllers/` + `data/mutations.ts`, delete legacy `application/`, `domain/`, `record/` dirs)
- **Phase G — Verify** (typecheck, regression greps, smoke)

Each phase leaves the app buildable. Layer boundaries are the pause points where you can stop and review.

---

## Phase A — Prisma + migration

**Intent:** One migration introduces all required schema changes. Because the user confirmed no real data (all disposable), it's a straightforward diff.

### Schema edits — `packages/db/prisma/schema.prisma`

- `FlooringInventory`:
  - add `warehouseId String?`
  - add `warehouse FlooringWarehouse? @relation(fields: [warehouseId], references: [id], onDelete: SetNull)`
  - add `isImported Boolean @default(false)`
  - **remove** `reservedStockCount Decimal @default(0) @db.Decimal(12, 2)` (dead with allocation drop)
  - **remove** `allocations FlooringWorkOrderItemAllocation[]`
  - add `@@index([warehouseId])`
- `FlooringWarehouse`:
  - add back-relation `inventories FlooringInventory[]`
- `FlooringCutLog`:
  - add `status String` (closed-set string: `"PENDING"` / `"FINAL"`, default `"PENDING"` via Prisma `@default("PENDING")`. DB enum deferred for consistency with import-status pattern.)
- `FlooringWorkOrderItem`:
  - **remove** `allocations FlooringWorkOrderItemAllocation[]`
  - **remove** `allocationStatus FlooringWorkOrderItemAllocationStatus @default(NOT_STARTED)` column
  - **remove** `changeOrderStatus FlooringChangeOrderStatus? @default(SUFFICIENT)` column
- `FlooringWorkOrder`:
  - **remove** `allocationRuns FlooringWorkOrderAllocationRun[]`
- `FlooringWorkOrderItemAllocationStatus` enum — **delete entire block**
- `FlooringChangeOrderStatus` enum — **keep** (used as the TypeScript type for computed `fulfillmentStatus` returned by normalizers; nothing stored)
- `FlooringWorkOrderItemAllocation` model — **delete entire block**
- `FlooringWorkOrderAllocationRun` model — **delete entire block**
- `FlooringWorkOrderAllocationRunStatus` enum — **delete**
- `FlooringAllocationMethod` enum — **delete** (verify no other consumers)

### Migration

Handcraft `packages/db/prisma/migrations/YYYYMMDDHHMMSS_canonical_sweep_imports_inventory_cutlogs_workorders/migration.sql`:

```sql
-- Drop allocation tables + runner (auto-allocation deferred; BullMQ queue infra stays)
DROP TABLE IF EXISTS "flooring_work_order_allocation_run";
DROP TABLE IF EXISTS "flooring_work_order_item_allocation";
DROP TYPE IF EXISTS "FlooringWorkOrderAllocationRunStatus";
DROP TYPE IF EXISTS "FlooringAllocationMethod";

-- Drop stored allocation + change-order status columns on work-order items (now computed)
ALTER TABLE "flooring_work_order_item"
  DROP COLUMN "allocationStatus",
  DROP COLUMN "changeOrderStatus";
DROP TYPE IF EXISTS "FlooringWorkOrderItemAllocationStatus";
-- Keep FlooringChangeOrderStatus enum — TypeScript type for computed fulfillmentStatus.

-- Inventory: warehouse link + received flag + drop dead reservedStockCount
ALTER TABLE "flooring_inventory"
  ADD COLUMN "warehouseId" TEXT,
  ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false,
  DROP COLUMN "reservedStockCount",
  ADD CONSTRAINT "flooring_inventory_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE SET NULL;
CREATE INDEX "flooring_inventory_warehouseId_idx" ON "flooring_inventory"("warehouseId");

-- Cut log status (PENDING | FINAL, default PENDING)
ALTER TABLE "flooring_cut_log"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
```

Apply via `npm run db:deploy --workspace @builders/db`. Rebuild `@builders/db`.

### Verification gate
- `prisma migrate status` shows clean.
- `npm run build --workspace @builders/db` succeeds; generated client lacks `flooringWorkOrderItemAllocation`, `flooringWorkOrderAllocationRun`, has `flooringInventory.warehouseId`, `flooringInventory.isImported`, `flooringCutLog.status`.
- Expected fallout: **significant TS error spike** in app code that still references the dropped models. Those errors are the roadmap for Phase C/D/F — they show where allocation logic lives and needs replacement/removal.

---

## Phase B — `packages/domain/src/flooring/`

**Intent:** Move/rebuild each module's domain layer. Pure types, rules, diff shapes, errors.

### B.1 — `imports/`
- `types.ts` — `ImportRow`, `ImportForm`, `EMPTY_IMPORT_FORM`, `toImportForm`, `IMPORT_STATUS_VALUES`, `IMPORT_TRANSPORT_TYPE_VALUES` + label helpers. Migrate `calculateImportSummary` from `modules/imports/domain/summary.ts`.
- `import-rules.ts` — `isImportStatus`, `isImportTransportType`, `isImportDeleteBlocked(counts)` (block if FINAL or any child inventory `isImported=true` or any cut logs ref child inventory), `buildImportDeleteBlockedMessage`. FIFO rule: `fifoReceivedAt = importEntry.createdAt` for all child inventory, even rows added later.
- `errors.ts` — `ImportExecutionError` + error-code union.
- `index.ts` — barrel.
- Wire into `packages/domain/src/index.ts`.

### B.2 — `inventory/`
- `types.ts` — `InventoryRow` (canonical: `warehouseId`, `locationId?`, `productId`, `itemNumber`, `dyeLot?`, `stockCount`, `cost?`, `freight?`, `isImported`, `fifoReceivedAt`, `notes?`, `createdAt`, `updatedAt`, `importEntryId?`). **No `reservedStockCount`** — replaced by computed `awaitingCut`. `InventoryForm`, `EMPTY_INVENTORY_FORM`, `toInventoryForm`. Keep `calculateInventoryCostSummary` (already here from products sweep).
- `inventory-rules.ts`:
  - `isInventoryDeleteBlocked(counts)` — block if any cut logs reference it, or any work-order item has linked cut logs that reference it.
  - `buildInventoryDeleteBlockedMessage`.
  - `assertLocationBelongsToWarehouse(location, warehouseId)` — throws typed issue.
  - **`computeStockAvailable({ stockCount, cutLogs })`** — `stockCount − sum(cutLogs.cut)`. Counts cuts regardless of status. Asserts result `>= 0` at save time (rejects cut whose total exceeds starting balance).
  - **`computeAwaitingCut(cutLogs)`** — `sum(cutLogs.cut where status === "PENDING")`.
  - **`canAddCutLog(inventory)`** — returns `inventory.isImported === true`. The gate for cut-log creation.
  - `stockCount >= 0` on create/update.
- `unit-conversion.ts` — category-aware conversion + fulfillment math (in scope this sweep; see the "Category-driven unit conversion" section above).
  - `CategoryUnitRule` type + `CATEGORY_UNIT_RULES` lookup (seeded vinyl-plank = `{ canSplit: false, rounding: "up" }`). Default rule for unknown categories: `{ canSplit: true, rounding: "exact" }`.
  - `convertStockToSend({ amountInStockUnit, coveragePerUnit })` — `amountInStockUnit × coveragePerUnit`. Pure multiplication, no rounding; used by work-order fulfillment checks where partial-box cut totals are valid inputs.
  - `computeCoverageAvailable({ stockAvailable, coveragePerUnit })` — same math as `convertStockToSend`, semantically scoped to "available physical stock converted to coverage unit". Kept distinct for call-site clarity.
  - `computeStockRequiredForQuantity({ quantityInSendUnit, coveragePerUnit, categorySlug })` — inverse. `quantity / coveragePerUnit` with category-aware rounding; returns whole boxes for vinyl-plank (`ceil`), decimals for fractional categories.
  - `isItemFulfilled({ quantityInSendUnit, cutLogsCutTotal, coveragePerUnit })` — `cutLogsCutTotal × coveragePerUnit >= quantityInSendUnit`. Overage allowed (never rejected). Work-orders' `computeItemFulfillmentStatus` wraps this.
- `formatters.ts` — consolidate `formatInventoryImportNumber`, `formatInventoryQuantity`, `formatInventoryStatus` (isImported → "Received" / "Pending"), `formatTransportType` (moved from imports' contracts to inventory formatters for shared use). **New** `formatFullLocationCode({ warehouseNumber, sectionNumber, rafter, level })` → `"W{wn}-S{sn}-R{r}-L{l}"`. Current `modules/inventory/domain/formatters.ts` contents migrate here.
- `diff-types.ts` — `InventoryRowDraft`, `InventoryRowUpdate`, `InventoryRowDelete`, `InventoryRowsDiff`, `DiffValidationIssue` variants (`DUPLICATE_ITEM_NUMBER_PER_LOCATION`, `LOCATION_WAREHOUSE_MISMATCH`, `IMPORT_WAREHOUSE_MISMATCH`, `UNKNOWN_PRODUCT`, `UNKNOWN_LOCATION`), `validateInventoryRowsDiff(diff, existing, warehouseId)`, `describeInventoryRowsDiffIssue(issue)`.
- `errors.ts` — `InventoryExecutionError` + code union (`INVENTORY_NOT_FOUND`, `INVENTORY_IN_USE`, `INVENTORY_VALIDATION_FAILED`, `INVENTORY_LOCATION_WAREHOUSE_MISMATCH`, `INVENTORY_WAREHOUSE_NOT_FOUND`, `INVENTORY_LOCATION_NOT_FOUND`, `CUT_LOG_INVENTORY_NOT_IMPORTED`, `CUT_LOG_EXCEEDS_STARTING_BALANCE`).
- `index.ts` — barrel.

### B.3 — `cut-logs/`
- `types.ts` — `CutLogRow`, `CutLogForm`, `CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL"] as const`, `CutLogStatus` type, `formatCutLogStatus` ("PENDING" → "Pending Cut", "FINAL" → "Final Cut" for UI display).
- `cut-log-rules.ts`:
  - `before - cut === after` arithmetic invariant.
  - `isCutLogStatus(value)` — enum guard.
  - `isCutLogDeleteBlocked(cutLog, parent)` — deferred placeholder; status-driven rules land when status gains behavior (e.g., "FINAL cuts can't be deleted without supervisor override").
- `diff-types.ts` — `CutLogDraft`, `CutLogUpdate`, `CutLogDelete`, `CutLogsDiff`, validators + describers. Cut logs are always a CHILD section of either an inventory row or a work-order material item; the diff validator takes a `parent: { kind: "inventory" | "workOrderItem", id }` context. When parent is an inventory row, validation also runs `canAddCutLog(inventory)` and throws `CUT_LOG_INVENTORY_NOT_IMPORTED` if gate fails.
- `errors.ts` — `CutLogExecutionError`.
- `index.ts` — barrel.

### B.4 — `work-orders/`
- `types.ts` — `WorkOrderRow`, `WorkOrderForm` (primary), `WorkOrderMaterialItemRow`/`Form`, `WorkOrderServiceItemRow`/`Form`, `WorkOrderSalesRepRow`/`Form`, empty forms, to-form helpers. **No** `allocationStatus` or `changeOrderStatus` fields on material-item row (both columns dropped). `WorkOrderMaterialItemRow` carries a computed `fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"` populated by the db read-repo normalizer. `WorkOrderRow` carries a computed `fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"` populated the same way.
- `fulfillment-status.ts` — the `FlooringChangeOrderStatus` enum is retired vocabulary-wise but the two-value TS union is what we use:
  - `FULFILLMENT_STATUS_VALUES = ["SHORTAGE", "SUFFICIENT"] as const` + `FulfillmentStatus` union.
  - `computeItemFulfillmentStatus({ quantityInSendUnit, cutLogsCutTotalInStockUnit, product, category })` → `"SHORTAGE" | "SUFFICIENT"`. Uses the inventory domain's category-aware unit conversion (`convertStockToSend(cutLogsCutTotalInStockUnit, product, category)`) to produce a send-unit total, then returns `SUFFICIENT` iff `sendUnitTotal >= quantityInSendUnit`. Overage is permitted (> is still SUFFICIENT).
  - `computeWorkOrderFulfillmentStatus(items: { fulfillmentStatus }[])` → `"SHORTAGE" | "SUFFICIENT"`. All-or-nothing: every item SUFFICIENT → SUFFICIENT; any SHORTAGE (or zero items) → SHORTAGE.
  - `formatFulfillmentStatus(value)` → `"Short"` / `"Assigned"` for UI labels.
  - Fulfillment status is **computed only, never stored**. Read-repo normalizers on `WorkOrderMaterialItemRow` and `WorkOrderRow` run the computation at query time, pulling cut-log `cut` totals through the shared select payload.
- `work-order-rules.ts` — `isWorkOrderDeleteBlocked(counts)` (block if cut logs exist on any item; status no longer participates because fulfillment is computed), delete-block message. "Change order" vocabulary is retired here — no `changeOrderStatus` references remain.
- `items-diff.ts` — material items diff including nested cut-log diff per item. `ItemsDiff = { added, modified, deleted }` where each added/modified item carries its own `cutLogs: CutLogsDiff`. Diff item shape carries no fulfillment / allocation field (computed-only at read time).
- `service-items-diff.ts` — simple row diff (no children).
- `sales-reps-diff.ts` — simple row diff.
- `errors.ts` — `WorkOrderExecutionError` + code union.
- `index.ts` — barrel.
- **Delete** existing `work-orders/allocations/*` subfolder wholesale (dead code after schema drop).
- **Delete** `work-orders/reservation-semantics.ts`. Its original job (tracking reserved stock per work order) collapses into two concepts that now live in the inventory domain: `stockAvailable` (from the inventory row's cut totals, computed) and `awaitingCut` (sum of PENDING cut logs, computed). Nothing in the work-order domain needs a reservation helper anymore — the work-order-view cut-log grid reads these fields directly off each inventory row.
- **Delete** `shared/inventory-allocation-totals.ts` — dead; inventory has no allocations field.

### Root index wiring
Add `inventory/`, `cut-logs/`, `work-orders/` (updated) to `packages/domain/src/index.ts` exports. `imports/` already added during imports-plan draft.

### Verification gate
- `npm run build --workspace @builders/domain` clean.
- Zero references to `FlooringWorkOrderItemAllocation` or `FlooringWorkOrderAllocationRun` in `packages/domain/src/`.

---

## Phase C — `packages/application/src/flooring/`

**Intent:** Use cases per module. Each opens its own `withDatabaseTransaction`, delegates rules to domain, persists via `packages/db/`.

### First: build `packages/db/src/flooring/` (shared dependency for Phase C)

Before writing use cases, scaffold the repositories they call. Each module's db folder follows the warehouse / products pattern: `shared.ts` (selects + payload types), `read-repository.ts` (normalizers, readers), `write-repository.ts` (writers + atomic diff primitive where applicable), `index.ts`.

- `packages/db/src/flooring/imports/` — `createImport`, `updateImport`, `deleteImportById`, `listImports`, `getImportById`, `getImportDetailById`, `getImportDeleteState`, `listImportOptions`, `applyImportInventoryRowsDiff(tx, input) → { rows, tempIdMap }`.
- `packages/db/src/flooring/inventory/` — `createInventory`, `updateInventory`, `deleteInventoryById`, `listInventory`, `getInventoryById`, `getInventoryDetailById`, `getInventoryDeleteState`, `listInventoryOptions`, `applyInventoryCutLogsDiff(tx, input) → { logs, tempIdMap }`.
- `packages/db/src/flooring/cut-logs/` — `createCutLog`, `updateCutLog`, `deleteCutLogById`, `listCutLogsByInventory`, `listCutLogsByWorkOrderItem`, `getCutLogById`. No own atomic-diff primitive — always applied through the parent's primitive.
- `packages/db/src/flooring/work-orders/` — `createWorkOrder`, `updateWorkOrder`, `deleteWorkOrderById`, `listWorkOrders`, `getWorkOrderById`, `getWorkOrderDetailById`, `getWorkOrderDeleteState`, `listWorkOrderOptions`, plus diff primitives: `applyWorkOrderMaterialItemsDiff(tx, input) → { items, cutLogs, tempIdMap }` (applies item diff AND the cut-log children in one transaction), `applyWorkOrderServiceItemsDiff`, `applyWorkOrderSalesRepsDiff`.
- ~~**Delete** `packages/db/src/flooring/work-orders/allocation-repository.ts` and `allocations/` subfolder.~~ **Done as a Phase-A prerequisite** — `@builders/db` couldn't build against the post-migration Prisma client while those files still referenced dropped models. The barrel re-export in `packages/db/src/index.ts` was also removed.

Root `packages/db/src/index.ts` — add each module's export, remove allocation exports.

### Read-path pattern: aggregates in SQL for list views, relation-loading for detail views

Because inventory's `stockAvailable`, `awaitingCut`, and `coverageAvailable` are computed from cut-log totals, the read repo needs to feed normalizers the right shape without N+1 or unbounded relation-loading. Standardize on:

- **List queries** (`listInventory`, `listImports` with inventory counts, `listWorkOrders` with item fulfillment rollups, any "how many rows on this page" endpoint): compute cut-log totals as **scalar aggregates in Postgres**, not by eager-loading the `cutLogs` relation. Pattern:

  ```sql
  SELECT i.*,
         COALESCE(SUM(cl."cut"), 0)                                         AS cut_logs_cut_total,
         COALESCE(SUM(cl."cut") FILTER (WHERE cl."status" = 'PENDING'), 0)  AS cut_logs_pending_total
  FROM flooring_inventory i
  LEFT JOIN flooring_cut_log cl ON cl."inventoryId" = i.id
  WHERE …
  GROUP BY i.id;
  ```

  Implemented via `prisma.$queryRaw` (or `$queryRawUnsafe` where composability requires). Normalizers accept the scalars (`cutLogsCutTotal`, `cutLogsPendingTotal`) rather than the raw `cutLogs` array, and run `computeStockAvailable` / `computeAwaitingCut` / `computeCoverageAvailable` on the scalars directly. One query per list view, O(rows) work in Postgres, no per-row round trips.

- **Detail queries** (`getInventoryDetailById`, `getWorkOrderDetailById` with material-items → cut-logs nested): relation-load the full `cutLogs` array — the detail view needs the individual rows for display anyway (cut-log grid), and one inventory / one work-order worth of cut logs is a bounded, small set.

Same pattern extends to work-order material-item `fulfillmentStatus` aggregation — list of work orders computes `(sumOfCuts, itemQuantity)` per item as aggregates; detail view loads the nested cut-logs relation.

This is the **only** correctness-neutral perf mitigation this model needs at current scale. Moving to stored-counter caching only becomes worthwhile if `EXPLAIN ANALYZE` of the aggregate query ever shows it as a hot-path bottleneck — at which point it's an additive optimization (cache column maintained by cut-log writes), not a rewrite.

### Then: use cases

Each use case: validate inputs via domain, resolve FKs via db read helpers, apply via db write, re-read and return the canonical Record.

#### C.1 — `imports/`
- `create-import.ts` — metadata only (no inventory rows; rows added via Phase-D section route after create).
- `update-import.ts` — primary metadata update.
- `delete-import.ts` — domain block check via `isImportDeleteBlocked`.
- `save-inventory-rows.ts` — `saveImportInventoryRowsUseCase(id, diff, client?)`:
  1. Lock parent import row (`SELECT … FOR UPDATE`).
  2. Refuse if import status is `FINAL`.
  3. Load current rows + resolve warehouse + locations.
  4. Validate via domain `validateInventoryRowsDiff` (duplicate itemNumber/location, location-warehouse match, warehouse matches import's warehouse).
  5. Assign tempIds → real uuids; set `fifoReceivedAt = importEntry.createdAt` for added rows; set `warehouseId` on each row from the resolved location's warehouse (source-of-truth rule).
  6. `applyImportInventoryRowsDiff`.
  7. Return `{ importEntry: ImportDetailRecord, tempIdMap }`.

#### C.2 — `inventory/`
- `create-inventory.ts` — standalone create (from inventory record view or import grid).
- `update-inventory.ts` — single-row update (inventory record view primary section).
- `delete-inventory.ts` — `isInventoryDeleteBlocked` (block if cut logs reference it, unless the use case allows cascade — default: block).
- `save-cut-logs.ts` — `saveInventoryCutLogsUseCase(inventoryId, diff, client?)`:

  **Lock scope: the inventory row + the specific cut-log rows the diff touches. Nothing else.** No work-order lock, no material-item lock — those graph neighbors aren't being written. The inventory-row lock alone closes concurrent-write races on this inventory's cut-log set (any other add/modify/delete against the same inventory must acquire the same lock and queue).

  1. `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE` — single parent, no ordering concern.
  2. If the diff contains modified or deleted cut-log rows, `SELECT id FROM flooring_cut_log WHERE id = ANY($1) ORDER BY id FOR UPDATE` on those specific cut-log rows. Added cut logs don't exist yet, so they're not locked (their insertion is protected by the inventory-row lock — a concurrent transaction can't sneak a colliding insert past it).
  3. Inside the locked transaction, load **fresh** cut-log totals for this inventory (scalar aggregate: `SUM("cut")` + `SUM("cut") FILTER (WHERE status='PENDING')`). Never trust a pre-lock snapshot.
  4. Validate via domain `validateCutLogsDiff` (arithmetic invariant `before − cut === after`, status enum). Then run the domain's `computeStockAvailable` assertion against the post-diff totals (`stockCount − newSumOfCuts ≥ 0`); throw `CUT_LOG_EXCEEDS_STARTING_BALANCE` if the diff would drive stock negative.
  5. `applyInventoryCutLogsDiff`.
  6. Return `{ inventory: InventoryDetailRecord, tempIdMap }`.

#### C.3 — `cut-logs/`
- No use cases in this sweep. Domain rules + db helpers are imported by parent use cases. If a standalone cut-log CRUD becomes needed later, the module layer is ready to absorb them.

#### C.4 — `work-orders/`

**Narrow-lock convention for every work-order atomic-diff save:** lock only the rows the diff actually touches. The `flooring_work_order` row is never `FOR UPDATE`-locked by a section save — primary-section, material-items, service-items, and sales-reps saves on the same work order run concurrently unless they happen to touch the same underlying rows. Envelope-level `assertExpectedUpdatedAt` against the work-order `updatedAt` stays (plain read, not a lock) to catch gross structural failures like "work order was deleted mid-edit".

- `create-work-order.ts` — record-level create (primary only; items/services/reps added via their section routes). No locks beyond the receipt.
- `update-work-order.ts` — primary section update. Locks the `flooring_work_order` row only (`SELECT id FROM flooring_work_order WHERE id = $1 FOR UPDATE`) — this is the *single row* being written, not the aggregate. Item / service / rep sections are not touched and not locked.
- `delete-work-order.ts` — `isWorkOrderDeleteBlocked`; cascade decision per schema `onDelete`. Lock the `flooring_work_order` row for the delete; nested cascades run in the same transaction.
- `save-material-items.ts` — `saveWorkOrderMaterialItemsUseCase(workOrderId, diff)`:

  **Lock scope: only the rows this save actually touches. The work-order row is NOT locked.** The model is narrow-lock: lock inventory rows touched by nested cut-log diffs, cut-log rows touched directly, and material-item rows touched directly. Work-order primary fields (status, notes, template sync) remain concurrently editable from the primary section; service items and sales reps sections also remain concurrently editable. This maximizes throughput on a work-order record view where multiple users or tabs operate on different sections, while still serializing correctly on anything that actually overlaps.

  **Deadlock prevention:** when holding multiple locks in one transaction, acquire them in a fixed category order — inventory rows → cut logs → material items — and within each category sort by `id`. Every code path follows this order, so two concurrent saves with overlapping lock sets queue cleanly rather than deadlock.

  **Concurrency invariant the locks preserve:** two material-items saves (same WO or different WO) touching the same inventory row serialize on the inventory lock — neither can read `stockAvailable` until the other commits. Two saves on the same WO touching *different* items and *different* inventory rows run fully in parallel. WO-primary edits (status change, notes) do not interact with material-items saves at all.

  1. Collect the three lock sets from the diff:
     - `inventoryIds`: every `inventoryId` referenced by any nested cut-log add / modify / delete across all items in the diff, de-duplicated.
     - `cutLogIds`: every `id` on modified or deleted cut-log entries across the nested diffs.
     - `materialItemIds`: every `id` on modified or deleted item entries, plus every item whose nested cut-log children are touched (modified, added, or deleted — the item's integrity depends on its children).
  2. Acquire locks in fixed category order, sorted by id within each:
     - `SELECT id FROM flooring_inventory WHERE id = ANY($1) ORDER BY id FOR UPDATE`
     - `SELECT id FROM flooring_cut_log WHERE id = ANY($1) ORDER BY id FOR UPDATE` (skip if empty)
     - `SELECT id FROM flooring_work_order_item WHERE id = ANY($1) ORDER BY id FOR UPDATE` (skip if empty)

     Added cut logs and added items don't exist yet — their insertion is protected by the inventory-row and cut-log locks on their targets, and by the idempotency receipt on the envelope.
  3. Inside the locked transaction, load **fresh** cut-log totals per touched inventory row (scalar aggregates per the read-path pattern above — `SUM("cut")` grouped by `inventoryId`). Run the domain's `computeStockAvailable` assertion (`stockAvailable ≥ 0` after applying the diff) against these fresh totals — never a pre-lock snapshot. Throw `CUT_LOG_EXCEEDS_STARTING_BALANCE` with the offending `inventoryId` if any row would go negative.
  4. Validate items diff + each item's nested cut-logs diff. Cut-log diff validation includes `canAddCutLog(inventory)` — throws `CUT_LOG_INVENTORY_NOT_IMPORTED` if any added cut log targets an unimported inventory row.
  5. For added items: assign uuid, resolve product. No allocation/fulfillment field written — computed at read time.
  6. For added cut logs under each item: assign uuid, **link all three scoping fields from the work-order context**: `workOrderId` (parent work order), `workOrderItemId` (the specific material item), `inventoryId` (which inventory row the cut draws from). Default `status: "PENDING"`.
  7. `applyWorkOrderMaterialItemsDiff`.
  8. Return `{ workOrder: WorkOrderDetailRecord, tempIdMap }` where tempIdMap covers both items and cut logs. The response re-read runs normalizers, so each material item carries its computed `fulfillmentStatus` ("SHORTAGE" | "SUFFICIENT") and the work-order record carries its aggregate `fulfillmentStatus`.

  **Transport-level `expectedUpdatedAt`:** the envelope's work-order-level `assertExpectedUpdatedAt` remains — it's a plain read (not a lock) and its job is to detect "work order was deleted / hard-reset mid-edit", not to serialize concurrent writers. Per-row `expectedUpdatedAt` on each modified/deleted material item and each modified/deleted cut log in the diff catches within-section concurrent edits without needing a work-order lock.
- `save-service-items.ts` — atomic diff for service items. **Lock scope:** only the touched `flooring_work_order_service_item` rows (modified + deleted; added don't exist yet). `SELECT id FROM flooring_work_order_service_item WHERE id = ANY($1) ORDER BY id FOR UPDATE`. No work-order lock, no material-item lock, no inventory lock — this section has no coupling to stock. Per-row `expectedUpdatedAt` on modified/deleted entries catches within-section concurrent edits.
- `save-sales-reps.ts` — atomic diff for sales reps. **Lock scope:** only the touched `flooring_work_order_sales_rep` rows. Same pattern as service items. The existing `@@unique([workOrderId, contactId])` constraint catches duplicate-contact races at the DB layer; the lock prevents the lost-update scenario on `percent` changes.
- **Delete** `packages/application/src/flooring/work-orders/allocations/*` subfolder entirely.
- **Review** consumers of the deleted allocation use cases (queues, worker): will have compile errors pointing at each call site. Each either deletes (no longer needed) or rewrites against cut logs.

### Verification gate
- `npm run build --workspace @builders/application` clean.
- Zero references to deleted allocation use cases / types in `packages/application/src/`.

---

## Phase D — Routes + `_validators.ts`

**Intent:** Canonical route shape per module. Each section gets its own mutation route.

### Standard handler for every mutation route
`applyRoutePolicy` (tool slug + rate limit scope) → `parseMutationEnvelope(body, validator, { requireExpectedUpdatedAt: true }` for PATCH/DELETE) → snapshot via `getXById` + `assertExpectedUpdatedAt` (PATCH/DELETE) → `enforceMutationReceipt` → `withMutationTelemetry(() => useCase(...))` → `finalizeMutationReceipt` → `routeJson`. Response body always carries the canonical Record(s) so the client reconciles without a refetch.

### D.1 — Imports

- `apps/web/app/api/imports/_validators.ts` — `validateImportInput`, `validateInventoryRowsDiff`.
- `apps/web/app/api/imports/route.ts` — GET (list via `listImports`) + POST (create via `createImportUseCase`).
- `apps/web/app/api/imports/[id]/primary/section/route.ts` — PATCH `updateImportUseCase`. Rate scope `imports.primary.section.replace`.
- `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` — PATCH `saveImportInventoryRowsUseCase`. Rate scope `imports.inventory-rows.section.replace`. Returns `{ importEntry, tempIdMap }`.
- `apps/web/app/api/imports/[id]/route.ts` — DELETE `deleteImportUseCase`.
- `apps/web/app/api/imports/options/route.ts` — GET form options via `@builders/db`.

### D.2 — Inventory

- `apps/web/app/api/inventory/_validators.ts` — `validateInventoryInput`, `validateCutLogsDiff`.
- `apps/web/app/api/inventory/route.ts` — GET (list) + POST (create).
- `apps/web/app/api/inventory/[id]/primary/section/route.ts` — PATCH `updateInventoryUseCase`.
- `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` — PATCH `saveInventoryCutLogsUseCase`.
- `apps/web/app/api/inventory/[id]/route.ts` — DELETE.
- `apps/web/app/api/inventory/options/route.ts` — GET form options (products, warehouses, locations).

### D.3 — Cut Logs
No top-level routes. All mutations flow through the parent's section route (inventory's `cut-logs/section` or work-orders' `items/section`).

**Delete** existing `apps/web/app/api/cut-logs/*` routes.

### D.4 — Work Orders

- `apps/web/app/api/work-orders/_validators.ts` — `validateWorkOrderInput`, `validateMaterialItemsDiff`, `validateServiceItemsDiff`, `validateSalesRepsDiff`.
- `apps/web/app/api/work-orders/route.ts` — GET (list) + POST (create).
- `apps/web/app/api/work-orders/[id]/primary/section/route.ts` — PATCH `updateWorkOrderUseCase`.
- `apps/web/app/api/work-orders/[id]/items/section/route.ts` — PATCH `saveWorkOrderMaterialItemsUseCase`.
- `apps/web/app/api/work-orders/[id]/service-items/section/route.ts` — PATCH `saveWorkOrderServiceItemsUseCase`.
- `apps/web/app/api/work-orders/[id]/sales-reps/section/route.ts` — PATCH `saveWorkOrderSalesRepsUseCase`.
- `apps/web/app/api/work-orders/[id]/route.ts` — DELETE.
- **Delete** existing routes tied to allocations:
  - `apps/web/app/api/work-orders/[id]/items/[itemId]/allocations/**`
  - `apps/web/app/api/work-orders/[id]/items/[itemId]/allocation-options/route.ts`
  - `apps/web/app/api/work-orders/[id]/allocation-options/route.ts`
  - `apps/web/app/api/work-orders/[id]/auto-allocation/route.ts`
  - `apps/web/app/api/work-orders/[id]/reconciliation/route.ts`
- **Review + update** `apps/web/app/api/work-orders/[id]/sync-template/route.ts` — template sync should keep working; it writes items via the new `applyWorkOrderMaterialItemsDiff` primitive instead of allocations.
- **Delete** per-item singular routes that are no longer needed once the section-save pattern covers all edits: `items/[itemId]/route.ts`, `service-items/[itemId]/route.ts`, `sales-reps/[repId]/route.ts`, and their `/section` variants. Audit each: keep only if the section-save pattern can't cover the use case (e.g., a detail fetch).

### Verification gate
- Typecheck errors in `app/api/` should reduce significantly (allocation-route errors disappear with file deletion; non-deleted routes use canonical lifecycle).
- `grep -rn "FlooringWorkOrderItemAllocation\|FlooringAllocationMethod" apps/web/app` → zero.

---

## Phase E — Dashboard pages

**Intent:** Each module's `page.tsx`, `[id]/page.tsx`, `new/page.tsx` reads from its own `modules/{module}/data/queries.ts`. The queries files are rewritten in Phase F to wrap `@builders/db` canonical reads; in Phase E the page-loader imports and prop types swap to canonical.

### Updates per module

- **Imports**: `page.tsx` + `[id]/page.tsx` + `new/page.tsx` — consume `ImportRecord` / `ImportDetailRecord`. Remove server pagination (contacts-pattern load-all).
- **Inventory**: `page.tsx` + `[id]/page.tsx` + `new/page.tsx` — consume `InventoryRecord` / `InventoryDetailRecord`. **Does not require** inventory-rows-to-warehouse reconciliation — now inventory knows its warehouse directly via `warehouseId`.
- **Cut Logs**: no dashboard pages. If stubs exist they get removed.
- **Work Orders**: `page.tsx` + `[id]/page.tsx` + `new/page.tsx` — consume `WorkOrderRecord` / `WorkOrderDetailRecord`. Any allocation-specific sub-pages go away.

### Verification gate
- Typecheck on dashboard pages clean.
- `grep -rn "@/modules/.*/domain\|@/modules/.*/application" apps/web/app/dashboard` → zero across the four modules.

---

## Phase F — Module slim (flatten + client mutations + data hardening)

**Intent:** Each module collapses to canonical four-folder shape; module-local `domain/`, `application/`, `record/`, and `data/api.ts` all delete.

### Target per module

```
apps/web/modules/{module}/
├── components/
│   ├── list/
│   └── record/
├── controllers/
└── data/
    ├── mutations.ts  (client-side POST/PATCH/DELETE helpers, withMutationMeta)
    └── queries.ts    (thin wrappers over @builders/db)
```

### F.1 — Imports
- Move `record/create/import-create-client.tsx` → `components/record/`.
- Move `record/detail/import-detail-client.tsx` → `components/record/`.
- Move `record/panel/import-record-panel.tsx` → `components/record/`.
- Move `record/panel/sections/import-primary-fields-section.tsx` → `components/record/`.
- Move `record/panel/sections/import-inventory-rows-section.tsx` → `components/record/`.
- Move `record/panel/controllers/use-import-primary-section.ts` → `controllers/`.
- Move `record/panel/controllers/use-import-inventory-rows-section.ts` → `controllers/`. Rewrite to build `ImportInventoryRowsDiff` client-side and call `updateImportInventoryRowsRequest`.
- New `data/mutations.ts` — 4 helpers: `createImportRequest`, `updateImportRequest`, `deleteImportRequest`, `updateImportInventoryRowsRequest`.
- Rewrite `data/queries.ts` — wraps `listImports`, `getImportDetailById`, `listImportOptions` from `@builders/db`.
- Delete `data/api.ts`, `application/`, `domain/`, `record/`, root shims (`services.ts`, `summary.ts`, `api.ts`, `table-filters.ts` if duplicated), `components/imports-client.tsx` (if shim).

### F.2 — Inventory
- Same folder moves: `record/` collapses to `components/record/`, `record/panel/controllers/` → `controllers/`.
- `record/panel/sections/inventory-cut-logs-section.tsx` (if it exists) stays in `components/record/`.
- New `data/mutations.ts` — 4 helpers: `createInventoryRequest`, `updateInventoryRequest`, `deleteInventoryRequest`, `updateInventoryCutLogsRequest`.
- Rewrite `data/queries.ts` — wraps canonical reads; stops direct Prisma.
- Delete `data/api.ts`, `application/`, `domain/` (formatters migrated to `@builders/domain` already), `record/`, root shims.
- Update `components/list/inventory-table.tsx` — swap status/transport formatters to `@builders/domain`.

### F.3 — Cut Logs
- Very thin module. Keep only shared render helpers:
  - `apps/web/modules/cut-logs/components/record/cut-log-row.tsx` (or similar) — rendered inside inventory's cut-logs-section AND later inside work-orders' items-section as child rows.
  - `apps/web/modules/cut-logs/data/queries.ts` — thin list helper if any dashboard-less list is kept; otherwise delete `data/` entirely.
- Delete everything else: `domain/`, `application/`, `data/api.ts`, record files, any dashboard-related code.

### F.4 — Work Orders
- Move `record/panel/**` files into `components/record/` and `controllers/` (same pattern).
- New `data/mutations.ts` — 6 helpers: `createWorkOrderRequest`, `updateWorkOrderRequest`, `deleteWorkOrderRequest`, `updateWorkOrderMaterialItemsRequest`, `updateWorkOrderServiceItemsRequest`, `updateWorkOrderSalesRepsRequest`.
- Rewrite `data/queries.ts` — canonical reads.
- Delete `data/api.ts`, `application/`, `domain/`, `record/`, root shims.
- Delete `components/` subdirs tied to allocations (e.g., material-allocations-editor replaced by a material-items-with-cut-logs grid component).
- Delete `mutations.ts`/`queries.ts` allocation-specific helpers.

### Tests
- Each module's tests under `apps/web/tests/modules/{module}/` get import-path updates + type-shape updates. Tests asserting allocation behavior get deleted.

### Verification gate
- For each module: `find apps/web/modules/{module} -type f | sort` matches the four-folder layout.
- `grep -rn "@/modules/{module}/(domain|application|record)" apps/web` → zero per module.
- `grep -rn "FlooringWorkOrderItemAllocation\|allocationRuns\|FlooringAllocationMethod" apps/web packages` (source only) → zero.

---

## Phase G — Verify

1. **Typecheck**: `npm run typecheck --workspace @builders/web 2>&1 | grep -c "error TS"`. Current baseline: 66. Expect a **massive drop** — the bulk of today's errors live in inventory / cut-logs / work-orders / imports `data/api.ts` files that are deleted. Residual errors should be only in modules not touched this sweep (management companies, properties, templates, admin).
2. **Regression greps** (source only, exclude `.next`, `dist`, `migrations_archive_*`):
   - `FlooringWorkOrderItemAllocation|FlooringAllocationMethod|FlooringWorkOrderAllocationRun|FlooringWorkOrderItemAllocationStatus` → zero.
   - `@/modules/(imports|inventory|cut-logs|work-orders)/(domain|application|record)` → zero.
   - `allocationRuns|allocation-repository` → zero.
   - `allocationStatus|changeOrderStatus|computeMaterialItemAllocationStatus` → zero (retired vocabulary; replaced by computed `fulfillmentStatus`).
   - `reservedStockCount|reservation-semantics` → zero (column dropped, file deleted).
3. **Packages build**: `db`, `domain`, `application` all clean.
4. **Dev smoke — full flows**:
   - **Imports**: list → new (create with metadata only; redirect to detail using id from response, no refetch) → detail → primary save (record view stays open; reconciles inline) → add inventory rows (atomic diff with tempIds → real ids in response) → edit an inventory row's cost (modified diff) → delete a row (deleted diff) → status-FINAL delete block → delete non-final import.
   - **Inventory**: list → new (standalone create — select warehouse first → location dropdown filters to that warehouse's R/L locations) → detail → primary save → `isImported` flip to `true` → add cut logs via the record-view cut-logs section (cascading dropdown: work-order picker → material-item picker filtered to items whose work order matches AND whose `productId` matches this inventory row; `inventoryId` auto-linked; `workOrderId` + `workOrderItemId` auto-linked from the picker) → atomic diff; blocked with `CUT_LOG_INVENTORY_NOT_IMPORTED` until `isImported=true` → edit a cut log (modified diff with before−cut=after invariant; `cut ≤ starting stockAvailable`) → mark cut log as `FINAL` (status field stores; `awaitingCut` drops; `stockAvailable` unchanged) → delete cut log (deleted diff) → verify `stockAvailable`, `awaitingCut`, and `coverageAvailable` display values match the computed rules (category-aware unit conversion; vinyl-plank boxes → whole-number sqft rounded up) → verify `W{n}-S{n}-R{n}-L{n}` code renders in the location column → delete inventory (blocked if cut logs exist).
   - **Work Orders**: list → new → detail → primary save (property, template sync, warehouse) → add material items with cut-log children in one save (atomic diff nested; cut logs auto-link `workOrderId` + `workOrderItemId` + `inventoryId`) → edit an item's quantity (verify `fulfillmentStatus` recomputes SHORTAGE→SUFFICIENT once cut totals cover it; allow overage) → verify work-order-level `fulfillmentStatus` aggregates all-or-nothing → attempt to add a cut log against an unimported inventory row (blocks with `CUT_LOG_INVENTORY_NOT_IMPORTED`) → delete item → delete work order (blocked if cut logs exist).
5. **Template sync** (work-orders only): `/api/work-orders/[id]/sync-template` re-runs; the new implementation writes items + cut logs via the section-save primitives, not the removed allocation primitive.
6. **Idempotency replay** verified on each module's POST by retrying the same `idempotencyKey`.

---

## Out of scope (future sweeps)

- **Templates** — will adopt the work-orders pattern (items, service items, sales reps as child sections). Currently unchanged schema-wise. Its `sync-template` consumer route gets updated in Phase D.4 but the template module itself (its CRUD routes, record view, data layer) stays as-is.
- **Properties** — its own sweep.
- **Management Companies** — its own sweep.
- **Admin users** — admin UI has some current TS errors; not in this sweep.
- **Auto-allocation worker job** — entire auto-match flow is deferred. Will come back as a BullMQ worker job once the core system is stable. BullMQ / worker / relay / outbox infrastructure **stays** — only the allocation-specific producer + consumer code is removed. Same slot is reserved for the future "generate work-order files" worker and the re-added auto-allocation.
- **Cut-log status behavior rules beyond `awaitingCut`** — the `status` field is added, stored (`"PENDING"` / `"FINAL"`), wired into `awaitingCut`, and user-editable from the cut-log row. Additional behavior keyed on status — locking `before`/`cut`/`after` on FINAL, or having FINAL count differently toward fulfillment — is deferred. `computeItemFulfillmentStatus` currently sums `cut` across ALL cut logs regardless of status.
- **`isImported` flip trigger** — field added and storable; the gate (no cuts on unimported rows) is wired in Phase B.2. But *what action* flips `isImported=true` (manual per-row checkbox vs. receiving workflow vs. FINAL-status auto-flip) is deferred. Default UI affordance for now: per-row toggle in the inventory record view.
- **Tool slugs** — `imports`, `inventory`, `cut-logs`, `work-orders` currently all share `toolSlug: "warehouse"`. Dedicated slugs require capability plumbing; deferred.
- **Canonical dropdown component** — every `<select>` across the app (product picker, warehouse picker, location picker, work-order picker, material-item picker, category picker, manufacturer picker, unit picker, etc.) currently reimplements its own search / render / empty-state / indexing logic. Replace with one shared `<RecordPicker>` (or similar) component that takes a table name + field name + options source, includes a built-in search bar wired to an indexed field per table, and standardizes keyboard nav, empty states, and "no match" messaging. Per-table indexing config ensures the search bar is fast regardless of option count (e.g., products indexed on `name + itemNumber`, work orders on `number + property.name`). Deferred — this sweep keeps the existing ad-hoc selects so it can focus on schema + fulfillment.
- **Search / sort / filter / grouping / columns-manager reconstruction** — the list-view engine and record-view engine both carry legacy per-module implementations for search, sort, filter, grouping, and the columns manager. A dedicated sweep will rebuild these as shared, canonical engine primitives: one search/sort/filter pipeline over the list view's row set, one grouping model, one columns-manager UI fed from a canonical column-definition schema, and record-view parity where applicable (e.g., searching/filtering the cut-logs child grid within an inventory record view). Grouping also gets split out of the columns manager into its own tool (see `~/.claude/projects/.../memory/project_grouping_separation.md`). Deferred — this sweep keeps each module's current list/record affordances as-is and does not touch the engines.

---

## Risk notes

1. **Schema drop is destructive** — `FlooringWorkOrderItemAllocation` and `FlooringWorkOrderAllocationRun` go away along with their data. Confirmed disposable. Migration won't roll back cleanly.
2. **Expected typecheck spike after Phase A** — expected. The current TS blast is largely `locationId` / stale-location-shape references from inventory rows that never got swept during the warehouse pass. Phase A compounds that with allocation-removal errors. That growing error list IS the to-do list for Phases C/D/F; each row you clear is a consumer migrated. Don't try to typecheck clean at mid-Phase-A.
3. **Auto-allocation behavior is dropped (temporarily)** — user direction: cherry-on-top later, re-added as a BullMQ worker job after the core system is stable. Per user: **keep the BullMQ worker app, web service, and relay app fully intact** — they're the host for the future auto-allocation job AND for the future "work-order file generation" worker. Only delete allocation-specific producer/consumer code, not the queue infrastructure itself. Practical targets for deletion: `packages/domain/src/queue/auto-allocate-work-order.ts` (the message-type definition for the allocation job), any queue handler in `apps/worker` that dispatches to it, the allocation-adjacent routes in `app/api/work-orders/[id]/auto-allocation/*`. KEEP: `packages/db/src/queues/outbox-repository.ts`, `QueueOutboxEventStatus` enum, `packages/domain/src/queue/send-work-order.ts`, `sync-inventory.ts`, `workflow-processing.ts` (other queue message types), and the worker + relay apps themselves.
4. **Reservation semantics reshaped around computed inventory fields** — user direction:
   - `reservedStockCount` column is **dropped** from `FlooringInventory` (dead after allocation removal).
   - New `stockAvailable = stockCount − sum(cutLogs.cut)` — single source of truth for "what's physically available". Computed. Invariant: `stockAvailable ≥ 0` (domain rejects cuts that would drive it negative with `CUT_LOG_EXCEEDS_STARTING_BALANCE`).
   - New `awaitingCut = sum(cutLogs.cut where status === "PENDING")` — the replacement concept for "reserved but not yet finalized". Computed. Flipping a cut log from `PENDING` → `FINAL` deducts from `awaitingCut` but leaves `stockAvailable` unchanged.
   - New `coverageAvailable = convertStockToSend(stockAvailable, product, category)` — the category-aware conversion of physical stock into sendable units (e.g., boxes → whole sqft, rounded up per the vinyl-plank rule). Computed.
   - All three are computed at the domain layer, not stored. Read queries include cut logs + product + category for the inventory rows they load; normalizers run the computations.
   - Work-order-side `reservation-semantics.ts` is **deleted** (not rewritten) — the work-order cut-log grid reads `stockAvailable` / `awaitingCut` / `coverageAvailable` directly off each inventory row it references. No work-order-side reservation helper survives.
5. **Fulfillment status is computed, never stored** — `FlooringWorkOrderItem.allocationStatus` and `FlooringWorkOrderItem.changeOrderStatus` columns both drop in Phase A (option (b) per user). The replacement `fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"` is a derived value applied by db read-repo normalizers at query time. Item-level rule: `SUFFICIENT` iff the category-converted send-unit total of child cut-log `cut` values is `≥` requested `quantity` (overage allowed). Work-order-level rule: all-or-nothing aggregate — every item SUFFICIENT → SUFFICIENT; any SHORTAGE (or zero items) → SHORTAGE. UI labels: "Short" / "Assigned" via `formatFulfillmentStatus`. Consequence: saves never write fulfillment; reads always recompute it — no drift, no batch backfill, no reconcile job.
6. **Queue infrastructure stays intact** — duplicating risk #3 for emphasis. Do NOT delete `apps/worker` or `apps/relay`. Do NOT delete `packages/db/src/queues/`, `QueueOutboxEventStatus`, or the outbox repository. Only allocation-specific message types and handlers go.
7. **Inventory row's `warehouseId` vs `location.warehouseId`** — two sources; domain rule enforces they match when both set. User direction: **warehouse is chosen first, then locations dropdown filters to that warehouse's `R/L` options.** No `sectionId` on inventory — sections are only referenced transitively through the chosen location. If the user later changes warehouse, `locationId` clears (the UI nudges a new selection). Display code: `W{n}-S{n}-R{n}-L{n}` via domain `formatFullLocationCode`.
8. **Cut-log status values** — per user: `"PENDING"` and `"FINAL"` (not `"PENDING_CUT"`/`"CONFIRMED_CUT"`). Plan updated throughout.
9. **Cut-log eligibility gate** — per user: an inventory row with `isImported === false` cannot accept new cut logs. Domain rule `canAddCutLog(inventory)` guards this in both the inventory's cut-log-section use case AND the work-order's items-section use case (both consume cut-log creation). Existing cuts on a row that later flips back to `isImported=false` are preserved; only new creation is blocked.
10. **Import default warehouse for inventory rows** — per user: inventory rows added via the imports record view default their `warehouseId` to the parent import's `warehouseId`. The warehouse selector is **not shown per row** inside the import UI. Warehouse on an inventory row is **only editable from the inventory record view**, standalone.
11. **Ordering cross-dependency inside Phase C** — cut-log domain/db needs to land before inventory and work-order use cases compile (they import cut-log diff types). Inventory domain/db before imports (imports' inventory-rows save imports the inventory domain diff validator). Order inside Phase C: cut-logs → inventory → imports → work-orders.
12. **Client reconciliation pattern consistency** — every create/update response returns the canonical Record; every atomic-diff save response returns `{ parent, tempIdMap }`. No refetch on any module's save path. Matches contacts / manufacturers / products / warehouse patterns exactly.
