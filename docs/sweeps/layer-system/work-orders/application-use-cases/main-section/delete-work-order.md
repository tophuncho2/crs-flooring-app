# deleteWorkOrderUseCase

`deleteWorkOrderUseCase(id: string, client?) → { deletedId: string }`

## Use case

### What it does
Hard-delete a work order. Cascades through child items / service items / sales reps (schema `onDelete: Cascade`). Cut logs referencing this WO have their `workOrderId` / `workOrderItemId` set to `null` (schema `onDelete: SetNull`) — **physical cut-log history is preserved**.

### Lock scope
- `SELECT id FROM flooring_work_order WHERE id = $1 FOR UPDATE`

### Transport guard
`assertExpectedUpdatedAt` against WO snapshot pre-transaction.

### Orchestration
1. Open transaction, lock WO row.
2. `getWorkOrderDeleteState(id, tx)` inside the lock:
   ```sql
   SELECT COUNT(*)::int AS cut_log_count
   FROM flooring_cut_log WHERE "workOrderId" = $1;
   ```
3. `isWorkOrderDeleteBlocked({ cutLogCount })` → on block, throw `WorkOrderExecutionError({ code: "WORK_ORDER_IN_USE", status: 409, message: buildWorkOrderDeleteBlockedMessage(reason) })`.
4. `deleteWorkOrderById(tx, id)` → `DELETE FROM flooring_work_order WHERE id = $1`. Schema cascades:
   - Items / service items / sales reps / analytics sidecar → Cascade (deleted)
   - Cut logs' `workOrderId` / `workOrderItemId` → SetNull (rows survive, links cleared)

### Response
`{ deletedId: id }`

## Domain

### `isWorkOrderDeleteBlocked({ cutLogCount })`
- `cutLogCount > 0` → `{ blocked: true, reason: "CUT_LOGS_PRESENT" }`. Deleting a WO with cut history would destroy the audit trail of what was physically cut for the job.
- Otherwise → `{ blocked: false }`.

Status (FINAL / complete) does not factor. Only cut-log presence blocks.

### `buildWorkOrderDeleteBlockedMessage(reason)`
Maps reason enum to human-readable 409 body.
