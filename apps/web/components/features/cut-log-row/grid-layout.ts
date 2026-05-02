// Canonical column definitions for cut-log grids. Single source of truth for
// the metadata that was previously duplicated across the inventory cut-log
// section, the inventory historical cut-log section, and (newly) the
// work-order cut-log section. Consumers pick the columns they need to build
// a `GridLayout`.
//
// The column set is intentionally identical across statuses (locked decision
// from the row-UI sweep): a row that flips PENDING → FINAL keeps the same
// columns. The destructive action (delete vs void) lives in a trailing
// control column; the column count never changes.

import type { GridColumn } from "../../grid/contracts/grid-column"
import type { GridControlColumn } from "../../grid/contracts/grid-control-column"
import type { GridLayout } from "../../grid/contracts/grid-layout"
import type { CutLogRow } from "@builders/domain"

/**
 * Column metadata, keyed by stable column id. Consumers project the keys
 * they need into a `GridLayout.dataColumns` array.
 */
export const CUT_LOG_COLUMN_DEFINITIONS = {
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

const STATUS_TRAILING_CONTROL: GridControlColumn = {
  key: "status",
  kind: "status-indicator",
  width: 132,
}

/**
 * Layout for the inventory record-view's "Active Cut Logs" section. Cut logs
 * are scoped to one inventory, so the inventory column is omitted; the WO
 * cross-reference columns ARE included. Read-only (inventory cut logs are
 * never editable from this side).
 */
export const INVENTORY_CUT_LOG_LAYOUT: GridLayout<CutLogRow> = {
  dataColumns: [
    CUT_LOG_COLUMN_DEFINITIONS.cutLogNumber,
    CUT_LOG_COLUMN_DEFINITIONS.cut,
    CUT_LOG_COLUMN_DEFINITIONS.coverageCut,
    CUT_LOG_COLUMN_DEFINITIONS.isWaste,
    CUT_LOG_COLUMN_DEFINITIONS.before,
    CUT_LOG_COLUMN_DEFINITIONS.after,
    CUT_LOG_COLUMN_DEFINITIONS.finalSeq,
    CUT_LOG_COLUMN_DEFINITIONS.workOrder,
    CUT_LOG_COLUMN_DEFINITIONS.workOrderItem,
    CUT_LOG_COLUMN_DEFINITIONS.createdAt,
    CUT_LOG_COLUMN_DEFINITIONS.updatedAt,
    CUT_LOG_COLUMN_DEFINITIONS.notes,
  ],
  trailingControls: [STATUS_TRAILING_CONTROL],
}

/**
 * Layout for the inventory record-view's "Final & Voided Cut Logs"
 * (historical) section. Identical columns to the active section.
 */
export const INVENTORY_HISTORICAL_CUT_LOG_LAYOUT: GridLayout<CutLogRow> =
  INVENTORY_CUT_LOG_LAYOUT
