# createWorkOrderUseCase

`createWorkOrderUseCase(input: WorkOrderForm, client?) → { workOrder: WorkOrderDetailRecord }`

## What it does
Record-level create of a work order. Primary-section fields only — material items, service items, and sales reps are added afterward via their respective section saves. If `templateId` is set, optionally runs a one-shot template sync copying the template's items / services / reps into the new work order as starting state.

## Lock scope
None beyond envelope receipt.

## Domain rules orchestrated

### `validateWorkOrderInput(input)`
Structural: required `propertyId`, `status` enum membership, `scheduledFor` format, optional `vacancy` enum.

**Data-layer action**:
- `SELECT id FROM property_hub WHERE id = $1` — property existence.
- If `templateId` set: `SELECT id, updated_at FROM flooring_template WHERE id = $1` — template existence + snapshot version.
- If `warehouseId` set: `SELECT id FROM flooring_warehouse WHERE id = $1`.

### `isWorkOrderStatus(input.status)` / `isVacancyStatus(input.vacancy)`
Enum guards (status is a DB-level enum; vacancy too).

**Data-layer action**: none — pure predicates.

### Template sync (if `templateId` present and `templateSyncMode === "COPY"`)
One-shot copy of template's items / service items / sales reps into the new work order. Stores `templateSnapshotHash` on the WO so divergence can be detected by future syncs.

**Data-layer action**: `getTemplateDetailById(templateId, tx)` loads template with children → use case constructs INSERT payloads for the three child tables, all inside the same transaction.

## Transaction flow
1. Open transaction.
2. Resolve FKs (property, optional template, optional warehouse).
3. Domain validation.
4. `createWorkOrder(tx, input)` → `INSERT INTO flooring_work_order (...)`. `workOrderNumber` auto-assigned by sequence.
5. If template sync: batched `INSERT` into `flooring_work_order_item`, `flooring_work_order_service_item`, `flooring_work_order_sales_rep`.
6. Re-read `getWorkOrderDetailById(newId, tx)` — normalizer computes per-item `fulfillmentStatus` (all `SHORTAGE` at creation since no cut logs exist) and aggregate WO-level `fulfillmentStatus`.

## Response
`{ workOrder: WorkOrderDetailRecord }`
