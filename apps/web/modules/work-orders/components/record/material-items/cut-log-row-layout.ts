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
 *
 * Canonical 7-column shape shared with the inventory record view's cut-log
 * section. Order: status → inventoryItem → before → cut → after →
 * coverageCut → cutLogNumber.
 */
export const WO_CUT_LOG_LAYOUT: GridLayout<CutLogGridRow> = {
  dataColumns: [
    { key: "status", label: "Status", minWidth: 120, grow: 0, align: "center" },
    { key: "inventoryItem", label: "Inventory Item", minWidth: 220, grow: 1.2 },
    { key: "before", label: "Before", minWidth: 120, grow: 0, align: "center" },
    { key: "cut", label: "Cut", minWidth: 144, grow: 0, align: "center" },
    { key: "after", label: "After", minWidth: 120, grow: 0, align: "center" },
    { key: "coverageCut", label: "Coverage Cut", minWidth: 144, grow: 0, align: "center" },
    { key: "cutLogNumber", label: "Cut Log #", minWidth: 132, grow: 0 },
  ],
}
