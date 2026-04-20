# updateWorkOrderUseCase

`updateWorkOrderUseCase(id: string, input: WorkOrderForm, client?) → { workOrder: WorkOrderDetailRecord }`

## Use case

### What it does
Primary-section replace. Edits status, property, template link, warehouse, scheduling, instructions, notes, Google Drive links. Does **not** touch items / services / reps — each has its own section save.

### Lock scope
- `SELECT id FROM flooring_work_order WHERE id = $1 FOR UPDATE` — only the single row being written.

Item / service-item / sales-rep sections remain concurrently editable by other writers (narrow-lock convention — see `save-material-items.md`).

### Transport guard
`assertExpectedUpdatedAt` against WO snapshot pre-transaction.

### Orchestration
1. Open transaction, lock WO row.
2. Load snapshot + re-assert `expectedUpdatedAt` inside the lock.
3. Resolve FKs: property, optional template, optional warehouse.
4. Run domain validators: `validateWorkOrderInput`, `isWorkOrderStatus`, `isVacancyStatus`.
5. `updateWorkOrder(tx, id, input)` → `UPDATE flooring_work_order SET ... WHERE id = $1`.
6. Re-read `getWorkOrderDetailById(id, tx)`.

### Response
`{ workOrder: WorkOrderDetailRecord }`

## Domain

### `validateWorkOrderInput(input)`
Structural — same contract as on create.

### `isWorkOrderStatus(input.status)`
Enum guard.

### `isVacancyStatus(input.vacancy)`
Enum guard.

### Template re-sync semantics — *deferred*
If `input.templateSyncMode` or `input.templateId` changes, the use case may replay template sync against the new template. This sweep preserves existing sync behavior without overhauling it; flagged for review. The default update path (no template change) doesn't touch children.
