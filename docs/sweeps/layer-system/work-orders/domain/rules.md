# Work Orders Domain — Rules

Pure predicate / invariant functions under `packages/domain/src/flooring/work-orders/work-order-rules.ts`.

## `isWorkOrderStatus(value: unknown): value is WorkOrderStatus`
Enum guard.

## `isVacancyStatus(value: unknown): value is VacancyStatus`
Enum guard.

## `isWorkOrderDeleteBlocked({ cutLogCount }): { blocked: boolean, reason?: WorkOrderDeleteBlockedReason }`
- `cutLogCount > 0` → `{ blocked: true, reason: "CUT_LOGS_PRESENT" }`. Deleting a work order that has cut-log history would destroy the audit trail of what was physically cut for the job.
- Otherwise → `{ blocked: false }`.

Status (e.g., FINAL / complete) does not factor. Only cut-log presence blocks. This is deliberate: an empty work order (no items, no cut logs) is trivially deletable regardless of status; a work order with cut logs is never deletable without an explicit supervisor path (deferred, out of scope for this sweep).

## `buildWorkOrderDeleteBlockedMessage(reason): string`
Maps reason enum to a human-readable 409 body.

## "Change order" vocabulary — retired
The old `FlooringChangeOrderStatus` / `allocationStatus` column pair is dropped from the schema as of Phase A. The work-orders domain does **not** define a `changeOrderStatus` field on any type, nor does it expose a `computeChangeOrderStatus` helper. The concept collapses into the computed `fulfillmentStatus` — see `fulfillment-status.md`. Any UI text that previously said "change order" should read "fulfillment" or "status" in its new home.

## `isWorkOrderCompleteStateValid(input)` — optional / deferred
Placeholder for a future rule around `isComplete` + `status` consistency. Not implemented in this sweep.

## Template sync contract
Not a single function — governs when `createWorkOrderUseCase` or `updateWorkOrderUseCase` copies template children into the WO. Invariants:

- If `templateId` is set and `templateSyncMode === "COPY"` on create, all three child types (items, service items, sales reps) are copied from the template at creation time; `templateSnapshotHash` is stored on the WO for future divergence detection.
- Re-sync on update is deferred behavior; this sweep preserves existing semantics.

## `computeMaterialItemSubtotal({ quantity, unitPrice }): string`
Pure decimal multiplication; surfaced on `WorkOrderMaterialItemRow` as a display field. Similar helper for service items.
