# deleteWorkOrderUseCase

`deleteWorkOrderUseCase(id: string, client?) → { deletedId: string }`

## What it does
Hard-delete a work order. Cascades through child items / service items / sales reps (schema `onDelete: Cascade`). Cut logs referencing this WO have their `workOrderId` / `workOrderItemId` set to `null` (schema `onDelete: SetNull`) — **physical cut-log history is preserved**.

## Lock scope
- `SELECT id FROM flooring_work_order WHERE id = $1 FOR UPDATE`

## Transport guard (pre-transaction)
`assertExpectedUpdatedAt` against WO snapshot.

## Domain rules orchestrated

### `isWorkOrderDeleteBlocked({ cutLogCount })`
Returns `{ blocked: true, reason: "CUT_LOGS_PRESENT" }` if any cut logs reference this WO. Deleting a WO that has cut history would destroy the audit trail of what was physically cut for the job — the domain prevents it, forcing an explicit supervisor override path (deferred, out of scope for this sweep).

**Data-layer action**: `getWorkOrderDeleteState(id, tx)` — single scalar inside the lock:
```sql
SELECT COUNT(*)::int AS cut_log_count
FROM flooring_cut_log WHERE "workOrderId" = $1;
```

### `buildWorkOrderDeleteBlockedMessage(reason)`
Formats the 409 body.

**Data-layer action**: none.

## Transaction flow
1. Open transaction, lock WO row.
2. `getWorkOrderDeleteState(id, tx)` inside lock.
3. Domain block → throw `WorkOrderExecutionError({ code: "WORK_ORDER_IN_USE", status: 409 })` if blocked.
4. `deleteWorkOrderById(tx, id)` → `DELETE FROM flooring_work_order WHERE id = $1`. Schema cascades:
   - `flooring_work_order_item` → Cascade (deleted)
   - `flooring_work_order_service_item` → Cascade
   - `flooring_work_order_sales_rep` → Cascade
   - `flooring_analytics` → Cascade (one-to-one sidecar)
   - `flooring_cut_log.workOrderId` / `.workOrderItemId` → SetNull (rows survive, links cleared)

## Response
`{ deletedId: id }`
