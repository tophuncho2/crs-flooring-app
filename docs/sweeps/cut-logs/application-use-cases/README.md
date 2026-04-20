# Cut Logs — No Standalone Use Cases

## Use case

### What it does
**Nothing.** Cut logs are a child concept; there is no `create-cut-log`, `update-cut-log`, or `delete-cut-log` use case in `packages/application/src/flooring/cut-logs/` by design. All cut-log creation, modification, and deletion flows through one of two parent section-save use cases.

### Parent use cases that write cut logs

#### `saveInventoryCutLogsUseCase` *(inventory module)*
- Path: `packages/application/src/flooring/inventory/save-cut-logs.ts`
- Route: `PATCH /api/inventory/[id]/cut-logs/section`
- UI entry: inventory record view → cut-logs section

Cut logs on this path have `inventoryId` **required**; `workOrderId` / `workOrderItemId` are **optional** — set only if the user picks a work order + material item via the cascading dropdown in the cut-log row.

Lock scope: parent inventory row + touched cut-log rows.

#### `saveWorkOrderMaterialItemsUseCase` *(work-orders module)*
- Path: `packages/application/src/flooring/work-orders/save-material-items.ts`
- Route: `PATCH /api/work-orders/[id]/items/section`
- UI entry: work-order record view → material items section (cut logs are nested children of each material item)

Cut logs added here are **auto-linked** by the use case: all three of `{ inventoryId, workOrderId, workOrderItemId }` get set from the work-order context — no manual picker surface.

Lock scope: touched inventory rows + touched cut-log rows + touched material-item rows. The work-order row itself is **not** locked (narrow-lock convention).

### Why no standalone use case?

Cut-log writes always need two things:
1. The parent inventory-row `FOR UPDATE` lock so the stock invariant (`stockAvailable >= 0`) is preserved across concurrent writers.
2. Parent-scope context (which inventory row; optionally which work order / material item).

Giving cut logs a standalone use case would either duplicate the lock-ordering and stock-invariant logic in a third place (harder to keep consistent) or skip the lock entirely (violates the invariant under concurrency). Both worse than routing through the two existing parent paths.

If a future requirement surfaces a truly standalone cut-log mutation (e.g., admin bulk-flip `PENDING` → `FINAL`), it lands as a new use case at that point — and must still acquire the inventory-row lock first under the same convention.

## Domain

### Types and rules consumed by both parent paths
See `../domain/types.md`, `../domain/rules.md`, `../domain/diff-types.md`, `../domain/errors.md` — the cut-logs domain ships types (`CutLogRow`, `CutLogStatus`, constants), predicates (`isCutLogStatus`, arithmetic invariant, linking rules), the `CutLogsDiff` shape + validator, and its error class. Both parent use cases consume this domain surface directly.

### Inventory rules consumed by both parent paths
- `canAddCutLog(inventory)` — the inventory-row `isImported` gate.
- `computeStockAvailable({ stockCount, cutLogs })` — the stock invariant the parent paths assert post-diff.

Both live in the inventory domain (they're properties of the inventory row, not the cut log). See `../../inventory/domain/rules.md`.
