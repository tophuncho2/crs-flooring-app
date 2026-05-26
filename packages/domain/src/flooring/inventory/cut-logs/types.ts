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
// Two snapshot families live on this shape:
//
// 1. Frozen-at-create snapshots — stamped once at insert and never mutated:
//    - `inventoryItem` (composed string)
//    - `categorySlug`
//    - `inventoryNumber` / `rollPrefix` / `rollNumber` / `dyeLot` /
//      `inventoryNote` (the 5 parent-identity primitives)
//    - `stockUnitName` / `stockUnitAbbrev` / `itemCoverageUnitName` /
//      `itemCoverageUnitAbbrev` (unit-of-measure labels)
//    - `productId` / `productName` / `warehouseId` (parent product +
//      warehouse linkage). `productName` is the user-facing label;
//      `productId` and `warehouseId` are FKs used for joins and to filter
//      the link-picker option lists in the cut-log edit panel.
//    Pre-snapshot rows (created before each column landed) surface as null
//    for the nullable fields. `productId` / `productName` / `warehouseId`
//    are non-null — the table was empty when those columns were added.
//
// 2. Denormalized mirror — re-stamped on every state-changing write:
//    - `location` is re-snapped from the parent inventory on create,
//      update-pending, and finalize. Already-voided rows have it nulled
//      (voiding is no longer a supported action).
export type CutLogRow = {
  id: string
  cutLogNumber: string
  inventoryId: string
  inventoryItem: string
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  location: string | null
  categorySlug: string
  productId: string
  productName: string
  warehouseId: string
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
// AND link fields (`workOrderId` / `workOrderItemId`) — links are carried on
// the separate `CutLogLinkUpdate` shape and the update-pending use case
// accepts both alongside.
export type CutLogPendingForm = {
  cut: string
  isWaste: boolean
  notes: string
}

// Shape passed alongside `CutLogPendingForm` on the update-pending use case
// to edit a cut log's WO/WOMI link. Both fields move together per
// `assertCutLogLinkageSymmetry`: either both null (unlinked) or both set
// (linked to a work-order item).
export type CutLogLinkUpdate = {
  workOrderId: string | null
  workOrderItemId: string | null
}

// Read shape returned to the inventory record view: a `CutLogRow` plus
// server-resolved labels for its work-order / material-item links and the
// snapshot warehouse's name. The work-orders side reads plain `CutLogRow`
// (the WO + WOMI context is already in scope on that surface).
//
// `workOrderNumber` and `workOrderItemProductLabel` are nullable to mirror
// the underlying link columns. `warehouseName` is non-null — it joins off
// the cut log's snapshot `warehouseId` which is NOT NULL.
export type InventoryCutLogRow = CutLogRow & {
  workOrderNumber: string | null
  workOrderItemProductLabel: string | null
  workOrderItemNotes: string | null
  warehouseName: string
}

// Page envelope returned by the inventory cut-logs list endpoint. `rows`
// is the bounded slice for the current skip/take window; `hasMore` signals
// another page is available (drives the hub's infinite-scroll list).
export type InventoryCutLogPage = {
  rows: InventoryCutLogRow[]
  hasMore: boolean
}

// Filter shape for the standalone cut-logs ledger list view
// (`/dashboard/cut-logs`). Warehouse is the only toolbar filter; the search
// bar targets `inventoryItem` (see the list read). `status` / `isWaste` are
// display columns on the ledger, not filters.
export type CutLogListFilters = {
  warehouseId?: ReadonlyArray<string>
}

/**
 * Parent-inventory context every cut-log mutation use case needs under the
 * per-inventory FOR UPDATE lock:
 *
 *   - `startingStock` + `currentTotalCutSum` for the
 *     `totalCutSum ≤ startingStock` invariant.
 *   - `coveragePerUnit` + `categorySlug` for `computeCutCoverage` — re-derived
 *     on every create and on every `cut`-changing update.
 *   - Unit-of-measure labels — stamped on the cut log row at create time
 *     (frozen thereafter).
 *   - Parent-identity primitives (`inventoryNumber` / `rollPrefix` /
 *     `rollNumber` / `dyeLot` / `inventoryNote`) — stamped on the cut log at
 *     create time (frozen thereafter).
 *   - `location` — the denormalized mirror, re-stamped on create / update /
 *     finalize and cleared on void.
 *
 * Pure domain shape — populated by the data layer's parent-context readers.
 */
export type CutLogParentContext = {
  inventoryId: string
  inventoryItem: string
  startingStock: string
  currentTotalCutSum: string
  coveragePerUnit: string | null
  categorySlug: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  location: string | null
  productId: string
  productName: string
  warehouseId: string
}
