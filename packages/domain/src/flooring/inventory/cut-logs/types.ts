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
//
// `inventoryItem` is an immutable snapshot copied from
// `inventory.inventoryItem` at cut creation time — it preserves the parent
// inventory's identity string (`inv# · roll# · location · dyeLot · note`)
// even if the inventory row is later edited. The cut log row never
// recomputes this column.
//
// Unit-snapshot fields (`stockUnitName` / `stockUnitAbbrev` /
// `itemCoverageUnitName` / `itemCoverageUnitAbbrev`) are stamped from the
// parent inventory at create time and never mutated afterward — they are
// the cut log's frozen unit-of-measure label, immune to later edits on
// the parent inventory's UoM. Pre-snapshot rows surface the columns as
// null.
export type CutLogRow = {
  id: string
  cutLogNumber: string
  inventoryId: string
  inventoryItem: string
  categorySlug: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string | null
  cut: string
  after: string | null
  coverageCut: string | null
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  status: FlooringCutLogStatus
  isFinal: boolean
  finalCutSequence: number | null
  isWaste: boolean
  void: boolean
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
  isWaste: boolean
  notes: string
}

export const EMPTY_CUT_LOG_PENDING_FORM: CutLogPendingForm = {
  cut: "",
  isWaste: false,
  notes: "",
}

export function toCutLogPendingForm(row: CutLogRow): CutLogPendingForm {
  return {
    cut: row.cut,
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

// Read shape returned to the inventory record view: a `CutLogRow` plus
// server-resolved labels for its work-order / material-item links. The
// work-orders side reads plain `CutLogRow` (the WO + WOMI context is
// already in scope on that surface). Both fields are nullable to mirror
// the underlying link columns.
export type InventoryCutLogRow = CutLogRow & {
  workOrderNumber: string | null
  workOrderItemProductLabel: string | null
}
