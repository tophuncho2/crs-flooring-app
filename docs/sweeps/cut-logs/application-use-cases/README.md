# Cut Logs — No Standalone Use Cases

Cut logs are a **child concept**. There is no `create-cut-log`, `update-cut-log`, or `delete-cut-log` use case in `packages/application/src/flooring/cut-logs/` by design. All cut-log creation, modification, and deletion flows through one of two parent section-save use cases.

## Parent use cases that write cut logs

### `saveInventoryCutLogsUseCase` *(inventory module)*
- **Path**: `packages/application/src/flooring/inventory/save-cut-logs.ts`
- **Route**: `PATCH /api/inventory/[id]/cut-logs/section`
- **UI entry**: inventory record view → cut-logs section

Cut logs on this path have `inventoryId` **required**; `workOrderId` / `workOrderItemId` are **optional** (set only if the user picks a work order + material item via the cascading dropdown in the cut-log row).

**Lock scope**: parent inventory row + touched cut-log rows. Full contract at `../../inventory/application-use-cases/save-cut-logs.md`.

### `saveWorkOrderMaterialItemsUseCase` *(work-orders module)*
- **Path**: `packages/application/src/flooring/work-orders/save-material-items.ts`
- **Route**: `PATCH /api/work-orders/[id]/items/section`
- **UI entry**: work-order record view → material items section (cut logs are nested children of each material item)

Cut logs added here are **auto-linked** by the use case: all three of `{ inventoryId, workOrderId, workOrderItemId }` get set from the work-order context — no manual picker surface on this path.

**Lock scope**: touched inventory rows + touched cut-log rows + touched material-item rows. The work-order row itself is **not** locked (narrow-lock convention — primary section, service items, and sales reps on the same WO remain concurrently editable). Full contract at `../../work-orders/application-use-cases/save-material-items.md`.

## Domain surface consumed by both paths

From `packages/domain/src/flooring/cut-logs/`:

- `CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL"] as const` + `isCutLogStatus(v)` guard
- `CutLogsDiff`, `validateCutLogsDiff(diff, parent)` — `parent` is `{ kind: "inventory", id }` or `{ kind: "workOrderItem", id }`
- Arithmetic invariant `before − cut === after` — enforced inside the diff validator per row
- `formatCutLogStatus(status)` — display helper (`"PENDING"` → `"Pending Cut"`, `"FINAL"` → `"Final Cut"`)
- `CutLogExecutionError` with codes: `CUT_LOG_INVENTORY_NOT_IMPORTED`, `CUT_LOG_EXCEEDS_STARTING_BALANCE`, `CUT_LOG_VALIDATION_FAILED`

From `packages/domain/src/flooring/inventory/`:

- `canAddCutLog(inventory)` — domain rule both parent paths must call before allowing any `added[]` entries
- `computeStockAvailable({ stockCount, cutLogs })` — both paths assert `>= 0` against the **post-diff** totals inside their lock

## Why no standalone use case?

Cut-log creation is always scoped to one of two contexts (inventory row, work-order material item). Giving it a standalone use case would either:
1. Duplicate the lock-ordering and stock-invariant logic in a third place (harder to keep consistent), or
2. Skip the lock entirely and violate `stockAvailable >= 0` under concurrency.

Both are worse than routing through the existing parent use cases. If a future requirement surfaces a truly standalone cut-log mutation (e.g., admin bulk-flip `PENDING` → `FINAL`), it lands as a new use case in `packages/application/src/flooring/cut-logs/` at that point — and must still acquire the inventory-row lock first under the same convention.
