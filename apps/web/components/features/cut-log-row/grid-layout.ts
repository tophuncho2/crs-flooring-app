// Canonical column definitions for cut-log grids. Single source of truth for
// the metadata used by the inventory cut-log section and (independently) the
// work-order cut-log section. Consumers pick the keys they need to build a
// `GridLayout`. Status is a regular data column on every layout; rows that
// flip PENDING → FINAL keep the same column count.

import type { GridColumn } from "../../grid/contracts/grid-column"
import type { GridLayout } from "../../grid/contracts/grid-layout"
import type { CutLogRow } from "@builders/domain"

/**
 * Column metadata, keyed by stable column id. Consumers project the keys
 * they need into a `GridLayout.dataColumns` array. WO-cross-reference and
 * timestamp keys live here for use in detail panels (not row grids).
 */
export const CUT_LOG_COLUMN_DEFINITIONS = {
  status: { key: "status", label: "Status", minWidth: 120, grow: 0, align: "center" },
  cutLogNumber: { key: "cutLogNumber", label: "Cut #", minWidth: 132, grow: 0 },
  inventoryRef: { key: "inventoryRef", label: "Inventory", minWidth: 200, grow: 0 },
  locationFilter: { key: "locationFilter", label: "Location", minWidth: 140, grow: 0 },
  cut: { key: "cut", label: "Cut", minWidth: 144, grow: 0, align: "center" },
  coverageCut: { key: "coverageCut", label: "Coverage", minWidth: 144, grow: 0, align: "center" },
  isWaste: { key: "isWaste", label: "Waste", minWidth: 80, grow: 0, align: "center" },
  before: { key: "before", label: "Before", minWidth: 120, grow: 0, align: "center" },
  after: { key: "after", label: "After", minWidth: 120, grow: 0, align: "center" },
  finalSeq: { key: "finalSeq", label: "Seq", minWidth: 64, grow: 0, align: "center" },
  workOrder: { key: "workOrder", label: "Work Order", minWidth: 140, grow: 0 },
  workOrderItem: { key: "workOrderItem", label: "Material Item", minWidth: 140, grow: 0 },
  createdAt: { key: "createdAt", label: "Created", minWidth: 156, grow: 0 },
  updatedAt: { key: "updatedAt", label: "Updated", minWidth: 156, grow: 0 },
  notes: { key: "notes", label: "Notes", minWidth: 220, grow: 1.2 },
} as const satisfies Record<string, GridColumn<CutLogRow>>

/**
 * Layout for the inventory record-view's unified cut-log section. PENDING
 * rows render first, then FINAL/VOID interleaved by `finalCutSequence`.
 * Status is a data column at index 0 (mirrors `WO_CUT_LOG_LAYOUT`); the
 * row is a click target for the view-only side panel that carries the
 * panel-only fields (work order, material item, created, updated).
 */
export const INVENTORY_CUT_LOG_LAYOUT: GridLayout<CutLogRow> = {
  dataColumns: [
    CUT_LOG_COLUMN_DEFINITIONS.status,
    CUT_LOG_COLUMN_DEFINITIONS.cutLogNumber,
    CUT_LOG_COLUMN_DEFINITIONS.cut,
    CUT_LOG_COLUMN_DEFINITIONS.coverageCut,
    CUT_LOG_COLUMN_DEFINITIONS.isWaste,
    CUT_LOG_COLUMN_DEFINITIONS.before,
    CUT_LOG_COLUMN_DEFINITIONS.after,
    CUT_LOG_COLUMN_DEFINITIONS.finalSeq,
    CUT_LOG_COLUMN_DEFINITIONS.notes,
  ],
}
