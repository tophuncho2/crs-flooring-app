import type { FlooringCutLogStatus } from "../../inventory/cut-logs/types.js"

/**
 * UI projection of a cut log row as displayed inside the WOMI section's
 * cut-log grid. Narrower than `CutLogRow` from the inventory cut-log
 * domain — drops fields the section doesn't render
 * (`cost` / `freight` / `createdAt` / `void` / `workOrderId` /
 * `workOrderItemId`) and pins `coverageCut` as a string (the SSR loader
 * normalizes nulls to "").
 */
export type WorkOrderItemPendingCutLogRow = {
  id: string
  cutLogNumber: string
  status: FlooringCutLogStatus
  isFinal: boolean
  inventoryId: string
  before: string | null
  cut: string
  after: string | null
  coverageCut: string
  isWaste: boolean
  notes: string
  finalCutSequence: number | null
  updatedAt: string
}

/**
 * Identity carried on every per-row pending-cut-log mutation. The use
 * case asserts:
 *   - The WOMI exists and `workOrderId` matches.
 *   - For update / delete: the cut log's `workOrderItemId` matches
 *     `workOrderItemId` (closes the cross-WOMI mutation gap).
 *   - `assertCutLogLinkageSymmetry` over `{ workOrderId, workOrderItemId }`.
 */
type PendingCutLogScope = {
  workOrderId: string
  workOrderItemId: string
}

/**
 * Per-row input types for the synchronous pending-cut-log mutations.
 * Each is consumed by exactly one application use case (create /
 * update / delete) and one API route.
 *
 * `requestKey` and `requestedBy` are NOT carried here — those are
 * API-boundary concerns (idempotency receipt + telemetry) handled by
 * `enforceMutationReceipt` and `applyRoutePolicy`. Use cases receive
 * only the operational input. Unit-of-measure snapshot fields are
 * also absent: they're stamped from the parent inventory row inside
 * the use case at create time and never mutated afterward.
 */

export type CreatePendingCutLogInput = PendingCutLogScope & {
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

export type UpdatePendingCutLogPatch = {
  cut?: string
  isWaste?: boolean
  notes?: string
}

export type UpdatePendingCutLogInput = PendingCutLogScope & {
  cutLogId: string
  expectedUpdatedAt: string
  patch: UpdatePendingCutLogPatch
}

export type DeletePendingCutLogInput = PendingCutLogScope & {
  cutLogId: string
  expectedUpdatedAt: string
}
