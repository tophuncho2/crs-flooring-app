# Work Orders — Data Layer (non-schema)

Everything the `packages/db/src/flooring/work-orders/` layer exposes that isn't a Prisma model or enum — computed fields, read-path patterns, aggregate queries for fulfillment rollups, write primitives, transactional composition.

## Computed fields

### `WorkOrderMaterialItemRecord.fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"`
Derived by the read-repo normalizer at query time. **Never stored.** Depends on:
- `item.quantity` (stored, in category `sendUnit`)
- `SUM(cutLogs.cut)` for cut logs where `workOrderItemId = item.id` (aggregate, in `stockUnit`)
- `product.coveragePerUnit` + `product.category` for unit conversion

Formula (delegated to the domain's `computeItemFulfillmentStatus`):
```
sendUnitCovered = cutLogsCutTotalInStockUnit × product.coveragePerUnit
return sendUnitCovered >= item.quantityInSendUnit ? "SUFFICIENT" : "SHORTAGE"
```

Overage allowed: `>` is still SUFFICIENT. Cut-log status (`PENDING` vs `FINAL`) does not factor — both count toward fulfillment.

### `WorkOrderRecord.fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"`
Aggregate all-or-nothing (delegated to the domain's `computeWorkOrderFulfillmentStatus`):
- Every item is SUFFICIENT → SUFFICIENT
- Any item SHORTAGE (or zero items) → SHORTAGE

Also computed on read; never stored.

## Read-path patterns

### `listWorkOrders(filter?, tx?)` → `WorkOrderRecord[]`
List-page query. Aggregates item-level `fulfillmentStatus` counts as scalars; the row-level aggregate (`WorkOrderRecord.fulfillmentStatus`) is derived from item counts in the normalizer.

```sql
SELECT wo.*,
       COALESCE(item_rollup.item_count,        0)::int AS item_count,
       COALESCE(item_rollup.sufficient_count,  0)::int AS sufficient_count,
       COALESCE(item_rollup.shortage_count,    0)::int AS shortage_count
FROM flooring_work_order wo
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS item_count,
         COUNT(*) FILTER (WHERE item_cut_total * p."coveragePerUnit" >= it."quantity")::int AS sufficient_count,
         COUNT(*) FILTER (WHERE item_cut_total * p."coveragePerUnit" <  it."quantity")::int AS shortage_count
  FROM flooring_work_order_item it
  JOIN flooring_product p ON p.id = it."productId"
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(cl."cut"), 0) AS item_cut_total
    FROM flooring_cut_log cl WHERE cl."workOrderItemId" = it.id
  ) sums ON true
  WHERE it."workOrderId" = wo.id
) item_rollup ON true
WHERE …
ORDER BY wo."createdAt" DESC;
```

Normalizer sees `{ item_count, sufficient_count, shortage_count }` and computes `fulfillmentStatus = shortage_count === 0 && item_count > 0 ? "SUFFICIENT" : "SHORTAGE"`.

### `getWorkOrderById(id, tx?)` → `WorkOrderRecord | null`
Single-row form of the list query, used for snapshot reads before mutations.

### `getWorkOrderDetailById(id, tx?)` → `WorkOrderDetailRecord | null`
Detail load: relation-loads material items + each item's nested cut logs + service items + sales reps + analytics. Per-item `fulfillmentStatus` computed in the normalizer from the nested cut-log array. Detail view owns the cut-log row-level display so relation-load is the right shape here; list view is aggregates-only.

### `getWorkOrderDeleteState(id, tx)` → `{ cutLogCount: number } | null`
Scalar used by the delete-block check. Always called inside the WO `FOR UPDATE` lock.

```sql
SELECT COUNT(*)::int AS cut_log_count
FROM flooring_cut_log WHERE "workOrderId" = $1;
```

### `listWorkOrderOptions(tx?)` → `{ properties, templates, warehouses, products, services, units, contacts }`
Form-option loader for create / edit. One multi-query batch, returns the full set.

## Write primitives

| Function | Behavior |
|---|---|
| `createWorkOrder(tx, input)` | `INSERT INTO flooring_work_order (...)`. `workOrderNumber` auto-assigned by `flooring_work_order_number_seq`. If template sync is requested, use case follows with batched `INSERT` into items / service-items / sales-reps tables in the same transaction. |
| `updateWorkOrder(tx, id, input)` | `UPDATE flooring_work_order SET ... WHERE id = $1`. Primary-section only; never touches children. |
| `deleteWorkOrderById(tx, id)` | `DELETE FROM flooring_work_order WHERE id = $1`. Cascades children per schema; cut logs' `workOrderId` / `workOrderItemId` → SetNull (cut-log rows preserved). |
| `applyWorkOrderMaterialItemsDiff(tx, input)` → `{ items, cutLogs, tempIdMap }` | Atomic section save for material items AND nested cut-log children in one transaction. Phase order: delete nested cut logs → delete items (cascades null out residual cut-log links) → insert added items → update modified items → insert added cut logs → update modified cut logs. |
| `applyWorkOrderServiceItemsDiff(tx, input)` → `{ items, tempIdMap }` | Atomic service-items diff. Delete → insert → update. |
| `applyWorkOrderSalesRepsDiff(tx, input)` → `{ reps, tempIdMap }` | Atomic sales-reps diff. Delete → insert → update. DB `@@unique([workOrderId, contactId])` catches duplicate-contact races as `P2002`. |

## Transactional composition

All primitives accept `tx` and compose under a single use-case-level transaction. The material-items primitive handles **both** item writes and nested cut-log writes in the same transaction — a partial apply (items saved, cut logs fail) is impossible.

## Lock helpers

The narrow-lock convention means each use case acquires only the rows it touches:

- `updateWorkOrderUseCase` / `deleteWorkOrderUseCase` — lock the WO row via `SELECT id FROM flooring_work_order WHERE id = $1 FOR UPDATE`.
- `saveWorkOrderMaterialItemsUseCase` — three separate multi-row locks: inventory rows, cut-log rows, material-item rows. **Not** the WO row. Acquisition order is fixed to prevent deadlock: inventory → cut-logs → material-items, sorted by id within each category.
- `saveWorkOrderServiceItemsUseCase` / `saveWorkOrderSalesRepsUseCase` — lock only their own row set via `WHERE id = ANY($1) ORDER BY id FOR UPDATE`. No WO lock.

Lock helpers exported from the write-repo: `lockWorkOrderRow(tx, id)`, `lockWorkOrderItems(tx, ids)`, `lockWorkOrderServiceItems(tx, ids)`, `lockWorkOrderSalesReps(tx, ids)`. The inventory-row and cut-log-row locks are the inventory module's `lockInventoryRow` / `lockCutLogs` — imported across module boundaries at the data-layer level (same package), which is allowed by `packages/db` rules.
