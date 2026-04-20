# saveWorkOrderSalesRepsUseCase

`saveWorkOrderSalesRepsUseCase(workOrderId: string, diff: SalesRepsDiff, client?) → { workOrder: WorkOrderDetailRecord, tempIdMap: Record<string,string> }`

## What it does
Atomic section save for the **sales-reps section** of a work order. Multiple reps per WO with `percent` splits.

## Lock scope
- `SELECT id FROM flooring_work_order_sales_rep WHERE id = ANY($1) ORDER BY id FOR UPDATE` — on `modified` + `deleted` ids only.

**No work-order lock.** The DB `@@unique([workOrderId, contactId])` constraint catches duplicate-contact races from concurrent adders; the row lock prevents lost-update on `percent` changes.

## Transport guard (pre-transaction)
- Envelope: `assertExpectedUpdatedAt` against WO snapshot.
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` entry.

## Domain rules orchestrated

### `validateSalesRepsDiff(diff, existing)`
Structural: rep ids exist (for modifies / deletes), `contactId` resolves, `percent` ∈ [0, 100], optional post-diff sum-to-100 invariant (UX-level — may produce a warning rather than a hard reject depending on policy).

**Data-layer action**:
- `existing`: `listSalesRepsByWorkOrder(workOrderId, tx)`.
- Contact existence: `SELECT id FROM flooring_contact WHERE id = ANY($1)`.

### Duplicate-contact guard
A given contact may only appear once per work order.

**Data-layer action**: optional pre-check via `SELECT "contactId" FROM flooring_work_order_sales_rep WHERE "workOrderId" = $1` for a cleaner 409 message; the DB `@@unique([workOrderId, contactId])` constraint is the authoritative backstop. A constraint violation surfaces as Prisma `P2002` → use case translates to `SalesRepExecutionError({ code: "SALES_REP_DUPLICATE_CONTACT", status: 409 })`.

### TempId → uuid assignment
**Data-layer action**: none.

## Transaction flow
1. Open transaction.
2. Lock touched sales-rep rows (skip if no modifies / deletes).
3. Load existing + resolve FKs.
4. Domain validation + duplicate-contact pre-check.
5. Assign tempIds.
6. `applyWorkOrderSalesRepsDiff(tx, prepared)`:
   - `DELETE FROM flooring_work_order_sales_rep WHERE id = ANY($deletedIds)`
   - Batched `INSERT` for added (DB `P2002` if a concurrent insert beat us to a `(workOrderId, contactId)` pair)
   - Per-row `UPDATE` for modified
7. Re-read `getWorkOrderDetailById(workOrderId, tx)`.

## Response
`{ workOrder: WorkOrderDetailRecord, tempIdMap }`

## Concurrency guarantees
Independent of every other section on the same WO. Runs in parallel with material-items, service-items, and primary-section saves. Only serializes against another sales-reps save touching the same rows, or races on the unique constraint (which surfaces as a typed 409).
