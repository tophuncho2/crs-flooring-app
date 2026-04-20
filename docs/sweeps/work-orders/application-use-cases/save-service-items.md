# saveWorkOrderServiceItemsUseCase

`saveWorkOrderServiceItemsUseCase(workOrderId: string, diff: ServiceItemsDiff, client?) → { workOrder: WorkOrderDetailRecord, tempIdMap: Record<string,string> }`

## Use case

### What it does
Atomic section save for the **service-items section** of a work order (install, tear-out, haul-away, etc.). No child entities; simple row diff with zero coupling to stock or fulfillment.

### Lock scope
- `SELECT id FROM flooring_work_order_service_item WHERE id = ANY($1) ORDER BY id FOR UPDATE` — on `modified` + `deleted` ids only. Added rows don't exist yet; skip if empty.

**No work-order lock. No material-item lock. No inventory lock.** This section has no stock coupling.

### Transport guard
- Envelope: `assertExpectedUpdatedAt` against WO snapshot.
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` entry.

### Orchestration
1. Open transaction.
2. Lock touched service-item rows (skip if no modifies / deletes).
3. Load existing via `listServiceItemsByWorkOrder(workOrderId, tx)`.
4. Resolve FKs: optional `serviceId` existence (`SELECT id FROM flooring_service WHERE id = ANY($1)`), `unitId` existence (`SELECT id FROM flooring_unit_of_measure WHERE id = ANY($1)`).
5. `validateServiceItemsDiff(diff, existing)`.
6. Assign tempIds → uuids.
7. `applyWorkOrderServiceItemsDiff(tx, prepared)`:
   - `DELETE FROM flooring_work_order_service_item WHERE id = ANY($deletedIds)`
   - Batched `INSERT` for added
   - Per-row `UPDATE` for modified
8. Re-read `getWorkOrderDetailById(workOrderId, tx)`.

### Response
`{ workOrder: WorkOrderDetailRecord, tempIdMap }`

### Concurrency guarantees
Independent of every other section on the same WO. Runs in parallel with material-items, sales-reps, and primary-section saves. Only serializes against another service-items save touching the same rows.

## Domain

### `validateServiceItemsDiff(diff, existing)` *(work-orders domain)*
Structural: item ids exist (for modifies / deletes), referenced `serviceId` / `unitId` resolve, `quantity >= 0`, unit-price format, stranded mod/delete ids, per-row `expectedUpdatedAt`.
