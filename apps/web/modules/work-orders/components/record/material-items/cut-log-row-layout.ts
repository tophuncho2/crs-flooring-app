import type { GridLayout } from "@/components/grid"
import type { PendingCutLogRowController } from "@/modules/work-orders/controllers/record/material-items/use-pending-cut-log-section"

export type CutLogGridRow = {
  id: string
  controller: PendingCutLogRowController
}

export const WO_CUT_LOG_LAYOUT: GridLayout<CutLogGridRow> = {
  leadingControls: [
    { key: "select", kind: "selection", width: 40 },
    { key: "commit", kind: "commit", width: 56 },
    { key: "status", kind: "status-indicator", width: 120 },
  ],
  dataColumns: [
    { key: "cutLogNumber", label: "Cut #", minWidth: 132, grow: 0 },
    { key: "inventoryRef", label: "Inventory", minWidth: 240, grow: 1 },
    { key: "cut", label: "Cut", minWidth: 110, grow: 0, align: "center" },
    { key: "coverageCut", label: "Coverage", minWidth: 120, grow: 0, align: "center" },
    { key: "before", label: "Before", minWidth: 90, grow: 0, align: "center" },
    { key: "after", label: "After", minWidth: 90, grow: 0, align: "center" },
    { key: "finalSeq", label: "Seq", minWidth: 64, grow: 0, align: "center" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1.5 },
    { key: "isWaste", label: "Waste", minWidth: 70, grow: 0, align: "center" },
    { key: "createdAt", label: "Created", minWidth: 140, grow: 0 },
    { key: "updatedAt", label: "Updated", minWidth: 140, grow: 0 },
  ],
  trailingControls: [{ key: "destructive", kind: "actions", width: 80 }],
}
