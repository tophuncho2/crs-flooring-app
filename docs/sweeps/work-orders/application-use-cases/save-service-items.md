# saveWorkOrderServiceItemsUseCase

`saveWorkOrderServiceItemsUseCase(workOrderId: string, diff: ServiceItemsDiff, client?) → { workOrder: WorkOrderDetailRecord, tempIdMap: Record<string,string> }`

## What it does
Atomic section save for the **service-items section** of a work order (install, tear-out, haul-away, etc.). No child entities; simple row diff with no coupling to stock or fulfillment.

## Lock scope
- `SELECT id FROM flooring_work_order_service_item WHERE id = ANY($1) ORDER BY id FOR UPDATE` — on `modified` + `deleted` ids only. Added rows don't exist yet; skip if empty.

**No work-order lock. No material-item lock. No inventory lock.** This section has zero stock coupling.

## Transport guard (pre-transaction)
- Envelope: `assertExpectedUpdatedAt` against WO snapshot.
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` entry in the diff.

## Domain rules orchestrated

### `validateServiceItemsDiff(diff, existing)`
Structural: item ids exist (for modifies / deletes), optional `serviceId` resolves, `unitId` resolves, `quantity >= 0`, unit-price format.

**Data-layer action**:
- `existing`: `listServiceItemsByWorkOrder(workOrderId, tx)`.
- If any entry carries `serviceId`: `SELECT id FROM flooring_service WHERE id = ANY($1)`.
- Unit existence: `SELECT id FROM flooring_unit_of_measure WHERE id = ANY($1)`.

### TempId → uuid assignment
**Data-layer action**: none.

## Transaction flow
1. Open transaction.
2. Lock touched service-item rows (skip if no modifies / deletes).
3. Load existing + resolve FKs.
4. Domain validation.
5. Assign tempIds.
6. `applyWorkOrderServiceItemsDiff(tx, prepared)`:
   - `DELETE FROM flooring_work_order_service_item WHERE id = ANY($deletedIds)`
   - Batched `INSERT` for added
   - Per-row `UPDATE` for modified
7. Re-read `getWorkOrderDetailById(workOrderId, tx)`.

## Response
`{ workOrder: WorkOrderDetailRecord, tempIdMap }`

## Concurrency guarantees
Independent of every other section on the same WO. Runs in parallel with material-items, sales-reps, and primary-section saves. Only serializes against another service-items save touching the same rows.
