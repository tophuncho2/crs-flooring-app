import type { CutLogRow } from "@builders/domain"
import type { GridLayout } from "@/components/grid"

export type CutLogGridRow = {
  id: string
  cutLog: CutLogRow
}

/**
 * Read-only display layout for the work-order cut-log row. All editing
 * happens in the side panel — the row is a click target for the panel and
 * holds no editable cells, no commit button, no destructive button, and no
 * selection checkbox. Status renders as a data column for consistent
 * column alignment with the rest of the grid.
 */
export const WO_CUT_LOG_LAYOUT: GridLayout<CutLogGridRow> = {
  dataColumns: [
    { key: "status", label: "Status", minWidth: 120, grow: 0, align: "center" },
    { key: "cutLogNumber", label: "Cut #", minWidth: 132, grow: 0 },
    { key: "inventoryRef", label: "Inventory", minWidth: 240, grow: 1 },
    { key: "cut", label: "Cut", minWidth: 110, grow: 0, align: "center" },
    { key: "coverageCut", label: "Coverage", minWidth: 120, grow: 0, align: "center" },
    { key: "before", label: "Before", minWidth: 90, grow: 0, align: "center" },
    { key: "after", label: "After", minWidth: 90, grow: 0, align: "center" },
    { key: "finalSeq", label: "Seq", minWidth: 64, grow: 0, align: "center" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1.5 },
    { key: "isWaste", label: "Waste", minWidth: 70, grow: 0, align: "center" },
  ],
}
