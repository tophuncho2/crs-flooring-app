# saveWorkOrderMaterialItemsUseCase

`saveWorkOrderMaterialItemsUseCase(workOrderId: string, diff: MaterialItemsDiff, client?) → { workOrder: WorkOrderDetailRecord, tempIdMap: Record<string,string> }`

## What it does
Atomic section save for the **material-items section** of a work order. Each item in the diff carries a **nested cut-logs diff** — add/modify/delete of items AND their cut-log children all in one transaction. Returns a `tempIdMap` covering both items and cut logs so the client reconciles optimistic ids without refetching.

## Lock scope *(critical — narrow-lock convention)*

**Lock what the save actually touches; NOT the work-order row.**

Three lock sets collected from the diff:

1. `inventoryIds`: every `inventoryId` referenced by any nested cut-log add / modify / delete across all items in the diff (deduplicated).
2. `cutLogIds`: every id on `modified` or `deleted` cut-log entries across all nested diffs.
3. `materialItemIds`: every id on `modified` or `deleted` item entries, **plus** every item whose nested cut-log children are touched.

Acquired in fixed category order — deadlock-avoidance:

1. `SELECT id FROM flooring_inventory WHERE id = ANY($1) ORDER BY id FOR UPDATE`
2. `SELECT id FROM flooring_cut_log WHERE id = ANY($1) ORDER BY id FOR UPDATE` (skip if empty)
3. `SELECT id FROM flooring_work_order_item WHERE id = ANY($1) ORDER BY id FOR UPDATE` (skip if empty)

The work-order row is **not** locked. WO-primary edits, service-items saves, and sales-reps saves on the same WO run concurrently with this use case.

## Transport guard (pre-transaction)
- Envelope: `assertExpectedUpdatedAt` against the work-order snapshot's `updatedAt` — plain read, catches "WO deleted / hard-reset mid-edit". Not a lock.
- Per-row: `expectedUpdatedAt` on every `modified` / `deleted` material-item entry and every `modified` / `deleted` cut-log entry nested inside the diff.

## Domain rules orchestrated

### `validateMaterialItemsDiff(diff, existing)`
Structural: item ids exist (for modifies / deletes), referenced products exist (for adds / modifies), `quantity >= 0`, unit-price format.

**Data-layer action**:
- `existing`: `listMaterialItemsByWorkOrder(workOrderId, tx)` — single SELECT inside the lock.
- Product existence: `SELECT id FROM flooring_product WHERE id = ANY($1)` over referenced product ids.

### `validateCutLogsDiff(childDiff, parent: { kind: "workOrderItem", id })` — per item
Arithmetic invariant `before − cut === after` on every entry. Status enum check via `isCutLogStatus`.

**Data-layer action**: nested cut-log set loaded per locked item via `listCutLogsByWorkOrderItem(itemId, tx)`. For newly-added items (whose first cut logs are in the same diff), there's no pre-existing set — validation runs against the added set alone.

### `canAddCutLog(inventory)` — per nested cut-log add
Gates every `added[]` cut-log entry on the target inventory row's `isImported`. Throws `CUT_LOG_INVENTORY_NOT_IMPORTED` on violation.

**Data-layer action**: inventory rows already loaded via the row-lock step; no extra query.

### `computeStockAvailable({ stockCount, cutLogs: postDiffProjection })` — per inventory row
For each touched inventory row, project the post-diff cut-log set (original minus `deleted`, with `modified.cut` replaced, plus `added.cut`), run `computeStockAvailable`, assert `>= 0`.

**Data-layer action**: per-inventory aggregate scalar inside the lock:
```sql
SELECT "inventoryId",
       COALESCE(SUM("cut"), 0) AS cut_total
FROM flooring_cut_log
WHERE "inventoryId" = ANY($1)
GROUP BY "inventoryId";
```
Combined with the diff's per-inventory deltas, use case asserts `stockAvailable >= 0` for every touched inventory row. Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` with the offending `inventoryId` on any violation.

### Auto-link rule for added cut logs
Every added cut log under an item gets all three scoping fields set from context: `inventoryId` (from the diff entry), `workOrderId` (the use case argument), `workOrderItemId` (the parent item's id — resolved via `tempIdMap` for items that are also new in this diff).

**Data-layer action**: `tempIdMap` populated in-use-case; values written into the INSERT payload.

### TempId → uuid assignment (two-pass)
1. Items first — every `added[].tempId` gets a uuid; `tempIdMap` populated.
2. Cut logs second — cut-log tempIds resolved; their `workOrderItemId` references (if pointing at a tempId) resolved through `tempIdMap` from pass 1.

**Data-layer action**: none.

## Transaction flow
1. Open transaction.
2. Collect the three lock sets from the diff.
3. Acquire locks in fixed category order (inventory → cut-logs → material-items), ordered by id within each category.
4. Load fresh cut-log totals per touched inventory (aggregate SQL per the read-path pattern).
5. Load existing material items + nested cut logs via the locked rows.
6. Domain validation: items diff + each item's nested cut-logs diff.
7. `canAddCutLog` gate on every nested cut-log add.
8. Stock-invariant assertion per touched inventory row against fresh totals.
9. Assign tempIds → uuids (items first, then cut logs with auto-link).
10. `applyWorkOrderMaterialItemsDiff(tx, prepared)`:
    - `DELETE FROM flooring_cut_log WHERE id = ANY($deletedCutLogIds)` — delete cut logs first so later item-deletes don't cascade-null them.
    - `DELETE FROM flooring_work_order_item WHERE id = ANY($deletedItemIds)` — cascades any remaining cut logs on those items to SetNull on `workOrderItemId`.
    - Batched `INSERT` for added items.
    - Per-row `UPDATE` for modified items.
    - Batched `INSERT` for added cut logs (all three scoping ids populated from step 9).
    - Per-row `UPDATE` for modified cut logs.
11. Re-read `getWorkOrderDetailById(workOrderId, tx)` — normalizer computes per-item `fulfillmentStatus` (`SHORTAGE` / `SUFFICIENT`) and aggregate `WorkOrderRecord.fulfillmentStatus`.

## Response
`{ workOrder: WorkOrderDetailRecord, tempIdMap }`

## Concurrency guarantees
- Two material-items saves on the **same** WO touching **different** items and **different** inventory rows → fully parallel.
- Two material-items saves (same or different WO) touching the **same** inventory row → serialize on the shared inventory-row lock. Neither can read `stockAvailable` until the other commits.
- WO-primary edits (status change, notes) on this WO → do not interact at all.
- Service-items + sales-reps saves on this WO → do not interact at all.
- **Cross-entry-point serialization**: a concurrent `saveInventoryCutLogsUseCase` save from the inventory record view that targets the same inventory row locks the **same** `flooring_inventory` row. The two paths serialize cleanly on that shared lock, preserving the stock invariant regardless of which section the user saves from.
