# saveWorkOrderMaterialItemsUseCase

`saveWorkOrderMaterialItemsUseCase(workOrderId: string, diff: MaterialItemsDiff, client?) → { workOrder: WorkOrderDetailRecord, tempIdMap: Record<string,string> }`

## Use case

### What it does
Atomic section save for the **material-items section** of a work order. Each item in the diff carries a **nested cut-logs diff** — adds / modifies / deletes of items AND their cut-log children in one transaction. Returns `tempIdMap` covering both items and cut logs so the client reconciles optimistic ids without refetching.

### Lock scope *(critical — narrow-lock convention)*

**Lock only the rows the save actually touches. The work-order row is NOT locked.**

Three lock sets collected from the diff:

1. `inventoryIds`: every `inventoryId` referenced by any nested cut-log add / modify / delete across all items in the diff (deduplicated).
2. `cutLogIds`: every id on `modified` or `deleted` cut-log entries across all nested diffs.
3. `materialItemIds`: every id on `modified` or `deleted` item entries, **plus** every item whose nested cut-log children are touched.

Acquired in fixed category order — deadlock-avoidance:

1. `SELECT id FROM flooring_inventory WHERE id = ANY($1) ORDER BY id FOR UPDATE`
2. `SELECT id FROM flooring_cut_log WHERE id = ANY($1) ORDER BY id FOR UPDATE` (skip if empty)
3. `SELECT id FROM flooring_work_order_item WHERE id = ANY($1) ORDER BY id FOR UPDATE` (skip if empty)

The work-order row is **not** locked. WO-primary edits, service-items saves, and sales-reps saves on the same WO run concurrently with this use case.

### Transport guard
- Envelope: `assertExpectedUpdatedAt` against the work-order snapshot's `updatedAt` — plain read, catches "WO deleted / hard-reset mid-edit". Not a lock.
- Per-row: `expectedUpdatedAt` on every `modified` / `deleted` material-item entry and every `modified` / `deleted` cut-log entry nested inside the diff.

### Orchestration
1. Open transaction.
2. Collect the three lock sets from the diff.
3. Acquire locks in fixed category order (inventory → cut-logs → material-items), sorted by id within each.
4. Load fresh cut-log totals per touched inventory via one scalar-aggregate query:
   ```sql
   SELECT "inventoryId", COALESCE(SUM("cut"), 0) AS cut_total
   FROM flooring_cut_log WHERE "inventoryId" = ANY($1) GROUP BY "inventoryId";
   ```
5. Load existing material items + nested cut logs via the locked rows.
6. `validateMaterialItemsDiff(diff, existing)` — structural items-level check.
7. Per item carrying a nested cut-logs diff: `validateCutLogsDiff(childDiff, existingChildren, { kind: "workOrderItem", id: itemId })` — arithmetic, status, linking rules.
8. `canAddCutLog(inventory)` gate on every nested cut-log `added[]` entry.
9. Stock-invariant assertion per touched inventory: project post-diff cut-log totals (fresh aggregate + diff deltas) → `computeStockAvailable >= 0`. Throw `CUT_LOG_EXCEEDS_STARTING_BALANCE` with offending `inventoryId` on violation.
10. Assign tempIds → uuids, two-pass: items first (so their real ids are known when cut-log `workOrderItemId` references them via tempId), then cut logs. Auto-link cut logs with all three scoping fields (`inventoryId` from diff, `workOrderId` from argument, `workOrderItemId` from parent item's resolved id).
11. `applyWorkOrderMaterialItemsDiff(tx, prepared)`:
    - `DELETE FROM flooring_cut_log WHERE id = ANY($deletedCutLogIds)` — delete nested cut logs first so later item-deletes don't cascade-null them.
    - `DELETE FROM flooring_work_order_item WHERE id = ANY($deletedItemIds)` — cascades any remaining cut logs on those items to SetNull on `workOrderItemId`.
    - Batched `INSERT` for added items.
    - Per-row `UPDATE` for modified items.
    - Batched `INSERT` for added cut logs (all three scoping ids populated from step 10).
    - Per-row `UPDATE` for modified cut logs.
12. Re-read `getWorkOrderDetailById(workOrderId, tx)` — normalizer computes per-item `fulfillmentStatus` (`SHORTAGE` / `SUFFICIENT`) and aggregate `WorkOrderRecord.fulfillmentStatus`.

### Response
`{ workOrder: WorkOrderDetailRecord, tempIdMap }`

### Concurrency guarantees
- Two material-items saves on the **same** WO touching **different** items and **different** inventory rows → fully parallel.
- Two material-items saves (same or different WO) touching the **same** inventory row → serialize on the shared inventory-row lock. Neither can read `stockAvailable` until the other commits.
- WO-primary edits (status change, notes) on this WO → do not interact.
- Service-items + sales-reps saves on this WO → do not interact.
- **Cross-entry-point serialization**: a concurrent `saveInventoryCutLogsUseCase` targeting the same inventory row acquires the **same** `flooring_inventory` row lock. The two paths serialize cleanly on that shared lock, preserving the stock invariant regardless of which section the user saves from.

## Domain

### `validateMaterialItemsDiff(diff, existing)` *(work-orders domain)*
Structural: item ids exist (for modifies / deletes), referenced `productId` exists (for adds / modifies), `quantity >= 0`, unit-price format, stranded mod/delete ids, per-row `expectedUpdatedAt`.

### `validateCutLogsDiff(childDiff, existingChildren, { kind: "workOrderItem", id })` *(cut-logs domain)*
Arithmetic invariant `before − cut === after`. Status enum via `isCutLogStatus`. Linking rules for the `"workOrderItem"` parent kind — `workOrderItemId` equals `parent.id`, `workOrderId` equals parent item's WO, `inventoryId` required.

### `canAddCutLog(inventory)` *(inventory domain)*
Gate: `inventory.isImported === true`. Throws `InventoryExecutionError({ code: "CUT_LOG_INVENTORY_NOT_IMPORTED", status: 409 })` on any `added[]` cut-log entry targeting an unimported row.

### `computeStockAvailable({ stockCount, cutLogs })` *(inventory domain)*
For each touched inventory row, project post-diff cut-log set and assert `>= 0`. Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` with the offending `inventoryId` on any violation. Runs against fresh totals inside the lock — never a pre-lock snapshot.

### Auto-link rule for added cut logs *(work-orders domain)*
Every added cut log under an item gets all three scoping fields set from context: `inventoryId` (from the diff entry), `workOrderId` (the use case argument), `workOrderItemId` (the parent item's resolved id). No manual picker surface on this path.
