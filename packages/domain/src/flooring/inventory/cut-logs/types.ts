// Cut-log status enum — pure domain string-literal union, kept in lockstep
// with `enum FlooringCutLogStatus` in `packages/db/prisma/schema.prisma`.
// Defining the union here (not importing from the Prisma client or
// `@builders/db`) keeps this file inside the domain layer's purity rules
// (`packages/domain/CLAUDE.md` rule 1: no DB imports). The generated Prisma
// type and this union are structurally identical, so values flow between
// layers without conversion.
//
// Lifecycle (post sweep-1):
//   PENDING → QUEUED → FINAL   (finalize worker path)
//   PENDING → QUEUED → VOID    (void worker path on a pending row)
//   FINAL   → QUEUED → VOID    (void worker path on a finalized row)
//
// `QUEUED` is a generic in-flight marker; the kind of worker job (pending-save,
// finalize, void) is encoded in the outbox topic, not in `status`.
export type FlooringCutLogStatus = "PENDING" | "QUEUED" | "FINAL" | "VOID"

// Backward-compat alias kept so existing call sites that imported
// `CutLogStatus` from this module continue to work without churn.
export type CutLogStatus = FlooringCutLogStatus

// Full cut-log read shape returned by the data layer. Decimal columns surface
// as strings (Prisma's `Decimal` is serialized to string at the data-layer
// boundary to keep precision predictable in the UI / API).
export type CutLogRow = {
  id: string
  cutLogNumber: string
  inventoryId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string
  cut: string
  after: string
  coverageCut: string | null
  status: FlooringCutLogStatus
  isFinal: boolean
  finalCutSequence: number | null
  isWaste: boolean
  void: boolean
  cost: string | null
  freight: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

// User-editable form for the pending-save flow. Excludes worker-only fields
// (`before` / `after` / `status` / `isFinal` / `finalCutSequence` / `void`)
// AND link fields (`workOrderId` / `workOrderItemId`) — links flow through
// their own sync use case per intent doc, not the pending-save worker.
export type CutLogPendingForm = {
  cut: string
  cost: string
  freight: string
  isWaste: boolean
  notes: string
}

export const EMPTY_CUT_LOG_PENDING_FORM: CutLogPendingForm = {
  cut: "",
  cost: "",
  freight: "",
  isWaste: false,
  notes: "",
}

export function toCutLogPendingForm(row: CutLogRow): CutLogPendingForm {
  return {
    cut: row.cut,
    cost: row.cost ?? "",
    freight: row.freight ?? "",
    isWaste: row.isWaste,
    notes: row.notes,
  }
}

// Shape passed to the separate sync link-edit use case (not the pending-save
// worker). Both fields move together per `assertCutLogLinkageSymmetry`:
// either both null (unlinked) or both set (linked to a work-order item).
export type CutLogLinkUpdate = {
  workOrderId: string | null
  workOrderItemId: string | null
}
