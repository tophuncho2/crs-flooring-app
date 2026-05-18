import type { GridLayout } from "@/components/grid"
import type { StagedInventoryRow } from "@builders/domain"

export type StagedInvGridRow = {
  id: string
  row: StagedInventoryRow
}

/**
 * Read-only display layout for the per-filter-row staged-inventory
 * sub-grid. All editing happens in the side panel — clicking a DRAFT
 * row opens it. QUEUED / IMPORTED rows stay in the grid as
 * non-interactive display.
 *
 * Column order — status leftmost (user-mandated): status → product →
 * rollNumber → startingStock → dyeLot → location → note. Trailing
 * control holds the inline duplicate + delete row-action buttons.
 */
export const STAGED_INV_ROW_LAYOUT: GridLayout<StagedInvGridRow> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "status", label: "Status", minWidth: 120, grow: 0, align: "center" },
    { key: "product", label: "Product", minWidth: 200, preferredWidth: 300, grow: 0.6 },
    { key: "rollNumber", label: "Roll #", minWidth: 160, grow: 0 },
    {
      key: "startingStock",
      label: "Starting Stock",
      kind: "number",
      minWidth: 156,
      grow: 0,
      align: "center",
    },
    { key: "dyeLot", label: "Dye Lot", minWidth: 124, grow: 0 },
    { key: "location", label: "Location", minWidth: 140, grow: 0 },
    { key: "note", label: "Note", minWidth: 240, grow: 1.2 },
  ],
  trailingControls: [{ key: "actions", kind: "actions", width: 96 }],
}
