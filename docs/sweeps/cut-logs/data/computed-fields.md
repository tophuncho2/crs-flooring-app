# Cut Logs — Data Layer (non-schema)

Everything the `packages/db/src/flooring/cut-logs/` layer exposes that isn't a Prisma model or enum — read helpers, aggregate queries consumed by parent modules, and the write-composition rule.

## Computed fields on the cut-log record

**None.** Every field on `CutLogRecord` is stored: `inventoryId`, `workOrderId`, `workOrderItemId`, `before`, `cut`, `after`, `status`, `notes`, `createdAt`, `updatedAt`.

The arithmetic invariant `before − cut === after` is a **domain rule** enforced at write time, not a computed read-side field. The read layer does not re-derive `after` on read; it returns whatever was stored (which the write path guaranteed was correct).

## Aggregate queries consumed by parent read paths

Cut logs don't own a list endpoint or a detail endpoint (they have no dashboard surface). The data layer exposes scalar-aggregate helpers that the inventory and work-order read repos call when building their own records.

### For inventory rows

```sql
SELECT "inventoryId",
       COALESCE(SUM("cut"),                                              0) AS cut_total,
       COALESCE(SUM("cut") FILTER (WHERE "status" = 'PENDING'),          0) AS pending_total
FROM flooring_cut_log
WHERE "inventoryId" = ANY($1)
GROUP BY "inventoryId";
```

Called inline inside inventory's `listInventory` / `getInventoryById` as part of the LEFT JOIN + GROUP BY — not as a separate round-trip. Powers inventory's `stockAvailable` and `awaitingCut`.

### For work-order material items

```sql
SELECT "workOrderItemId",
       COALESCE(SUM("cut"),                                              0) AS cut_total
FROM flooring_cut_log
WHERE "workOrderItemId" = ANY($1)
GROUP BY "workOrderItemId";
```

Called inline inside work-orders' `listWorkOrders` / `getWorkOrderById` / `getWorkOrderDetailById`. Powers work-order's `fulfillmentStatus` computation per item. Cut-log `status` doesn't factor into fulfillment (overage allowed, both PENDING and FINAL count).

## Read helpers

| Function | Behavior |
|---|---|
| `listCutLogsByInventory(inventoryId, tx?)` → `CutLogRecord[]` | Used by `saveInventoryCutLogsUseCase` to load `existing` inside the lock for diff validation. Straight `SELECT ... ORDER BY "createdAt" ASC`. |
| `listCutLogsByWorkOrderItem(itemId, tx?)` → `CutLogRecord[]` | Used by `saveWorkOrderMaterialItemsUseCase` to load nested children per item inside the lock. |
| `getCutLogById(id, tx?)` → `CutLogRecord \| null` | Rare single-row fetch; primarily used by tests and admin tooling. |

## Write primitives

**There is no standalone cut-log write primitive.** Cut-log inserts / updates / deletes are always applied via a parent's atomic-diff primitive:

- From the inventory record view → `applyInventoryCutLogsDiff` (in `packages/db/src/flooring/inventory/write-repository.ts`)
- From the work-order record view → `applyWorkOrderMaterialItemsDiff` (in `packages/db/src/flooring/work-orders/write-repository.ts`) — which internally handles item + nested cut-log writes in one transaction.

This is deliberate: every cut-log write must happen under the parent inventory row's `FOR UPDATE` lock so the stock invariant (`stockAvailable ≥ 0`) is preserved across concurrent writers. Exposing a standalone `createCutLog(tx, input)` would invite callers to skip the lock. If a future admin tool needs batch cut-log edits, it composes the parent's primitive under the same lock convention.

## Transactional composition

Read helpers accept `tx?` for composition inside a transaction; all do so without opening their own. The absence of standalone write primitives means cut-log writes never need their own transaction — the parent's atomic-diff primitive owns the transaction boundary.
