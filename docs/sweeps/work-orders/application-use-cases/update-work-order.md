# updateWorkOrderUseCase

`updateWorkOrderUseCase(id: string, input: WorkOrderForm, client?) → { workOrder: WorkOrderDetailRecord }`

## What it does
Primary-section replace. Edits status, property, template link, warehouse, scheduling, instructions, notes, Google Drive links. Does **not** touch items / services / reps — each has its own section save.

## Lock scope
- `SELECT id FROM flooring_work_order WHERE id = $1 FOR UPDATE` — only the single row being written.

Item / service-item / sales-rep sections remain concurrently editable by other writers (narrow-lock convention — see `save-material-items.md` for the full pattern).

## Transport guard (pre-transaction)
`assertExpectedUpdatedAt` against WO snapshot.

## Domain rules orchestrated

### `validateWorkOrderInput(input)`
Structural + FK resolution (same pattern as `createWorkOrderUseCase`).

**Data-layer action**: property, optional template, optional warehouse existence checks via `SELECT id FROM ... WHERE id = $1`.

### `isWorkOrderStatus(input.status)` / `isVacancyStatus(input.vacancy)`
Enum guards.

**Data-layer action**: none.

### Template re-sync semantics *(deferred behavior)*
If `input.templateSyncMode` or `input.templateId` changes, the use case may replay template sync against the new template. **This sweep preserves existing sync behavior without overhauling it** — flagged for review in Phase D.

**Data-layer action**: if re-sync is triggered, it uses the material-items / service-items / sales-reps write primitives inside the same transaction. Under the narrow-lock convention, re-sync would then also need to acquire the appropriate child-section locks; the default path (no template change, no re-sync) doesn't touch children at all.

## Transaction flow
1. Open transaction, lock WO row.
2. Load snapshot + re-assert `expectedUpdatedAt`.
3. Resolve FKs.
4. Domain validation.
5. `updateWorkOrder(tx, id, input)` → `UPDATE flooring_work_order SET ... WHERE id = $1`.
6. Re-read `getWorkOrderDetailById(id, tx)` — normalizer refreshes counts + computed `fulfillmentStatus` values (unchanged by a primary-only edit, but re-read guarantees the response is fresh).

## Response
`{ workOrder: WorkOrderDetailRecord }`
