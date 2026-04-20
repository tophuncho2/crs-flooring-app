# saveWorkOrderSalesRepsUseCase

`saveWorkOrderSalesRepsUseCase(workOrderId: string, diff: SalesRepsDiff, client?) → { workOrder: WorkOrderDetailRecord, tempIdMap: Record<string,string> }`

## Use case

### What it does
Atomic section save for the **sales-reps section** of a work order. Multiple reps per WO with `percent` splits.

### Lock scope
- `SELECT id FROM flooring_work_order_sales_rep WHERE id = ANY($1) ORDER BY id FOR UPDATE` — on `modified` + `deleted` ids only.

**No work-order lock.** DB `@@unique([workOrderId, contactId])` catches duplicate-contact races from concurrent adders; the row lock prevents lost-update on `percent` changes.

### Transport guard
- Envelope: `assertExpectedUpdatedAt` against WO snapshot.
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` entry.

### Orchestration
1. Open transaction.
2. Lock touched sales-rep rows (skip if no modifies / deletes).
3. Load existing via `listSalesRepsByWorkOrder(workOrderId, tx)`.
4. Resolve FKs: contact existence (`SELECT id FROM flooring_contact WHERE id = ANY($1)`).
5. `validateSalesRepsDiff(diff, existing)`.
6. Optional duplicate-contact pre-check (for a cleaner 409 message) via `SELECT "contactId" FROM flooring_work_order_sales_rep WHERE "workOrderId" = $1`.
7. Assign tempIds → uuids.
8. `applyWorkOrderSalesRepsDiff(tx, prepared)`:
   - `DELETE FROM flooring_work_order_sales_rep WHERE id = ANY($deletedIds)`
   - Batched `INSERT` for added (DB `P2002` if a concurrent insert beat us to a `(workOrderId, contactId)` pair → translated to `SALES_REP_DUPLICATE_CONTACT`)
   - Per-row `UPDATE` for modified
9. Re-read `getWorkOrderDetailById(workOrderId, tx)`.

### Response
`{ workOrder: WorkOrderDetailRecord, tempIdMap }`

### Concurrency guarantees
Independent of every other section on the same WO. Runs in parallel with material-items, service-items, and primary-section saves. Only serializes against another sales-reps save touching the same rows, or races on the unique constraint (which surfaces as a typed 409).

## Domain

### `validateSalesRepsDiff(diff, existing)` *(work-orders domain)*
Structural: rep ids exist (for modifies / deletes), `contactId` resolves, `percent ∈ [0, 100]`, stranded mod/delete ids, per-row `expectedUpdatedAt`, optional post-diff sum-to-100 warning (UX-only).

### Duplicate-contact guard
A given contact may only appear once per work order. Enforced by DB `@@unique([workOrderId, contactId])` (authoritative) and mirrored at the domain by an optional pre-check that produces a cleaner 409 message. Constraint violation → Prisma `P2002` → `WorkOrderExecutionError({ code: "SALES_REP_DUPLICATE_CONTACT", status: 409 })`.
