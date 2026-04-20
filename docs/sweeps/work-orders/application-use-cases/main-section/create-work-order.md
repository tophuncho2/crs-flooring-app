# createWorkOrderUseCase

`createWorkOrderUseCase(input: WorkOrderForm, client?) → { workOrder: WorkOrderDetailRecord }`

## Use case

### What it does
Record-level create of a work order. Primary-section fields only — material items, service items, and sales reps are added afterward via their respective section saves. If `templateId` is set, optionally runs a one-shot template sync copying the template's items / services / reps into the new work order as starting state.

### Lock scope
None beyond envelope receipt.

### Transport guard
Envelope idempotency receipt only.

### Orchestration
1. Open transaction.
2. Resolve FKs: `SELECT id FROM property_hub WHERE id = $1`; optional `SELECT id, updated_at FROM flooring_template WHERE id = $1`; optional `SELECT id FROM flooring_warehouse WHERE id = $1`.
3. Run domain validators: `validateWorkOrderInput`, `isWorkOrderStatus`, `isVacancyStatus`.
4. `createWorkOrder(tx, input)` → `INSERT INTO flooring_work_order (...)`. `workOrderNumber` auto-assigned by `flooring_work_order_number_seq`.
5. If `templateId` set and `templateSyncMode === "COPY"`: `getTemplateDetailById(templateId, tx)` → batched `INSERT` into `flooring_work_order_item`, `flooring_work_order_service_item`, `flooring_work_order_sales_rep` under the same transaction. Store `templateSnapshotHash` on the WO row.
6. Re-read `getWorkOrderDetailById(newId, tx)` — normalizer computes per-item `fulfillmentStatus` (all `SHORTAGE` at creation since no cut logs exist) and aggregate `WorkOrderRecord.fulfillmentStatus`.

### Response
`{ workOrder: WorkOrderDetailRecord }`

## Domain

### `validateWorkOrderInput(input)`
Structural: required `propertyId` + `status`, optional templateId / warehouseId FK shape, `scheduledFor` date format, `unitLabel` / `unitType` / `customAddress` / `instructions` / `notes` string constraints.

### `isWorkOrderStatus(input.status)`
Enum guard — closed set.

### `isVacancyStatus(input.vacancy)`
Enum guard — closed set, optional.

### Template sync contract
Invariant: if `templateId` is set and `templateSyncMode === "COPY"` on create, all three child types are copied from the template at creation time; `templateSnapshotHash` is stored for future divergence detection. Re-sync on update is out of scope for this sweep.
