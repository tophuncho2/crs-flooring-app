import type { GridLayout } from "@/engines/record-view"
import type { ImportStagedRowDraft } from "@/modules/imports/controllers/record/drafts"

export type StagedInvGridRow = {
  id: string
  draft: ImportStagedRowDraft
}

/**
 * Per-filter-row staged-inventory sub-grid layout. DRAFT rows render
 * editable cells (rollNumber, dyeLot, location, startingStock, note);
 * QUEUED / IMPORTED rows render the same columns read-only. The status
 * column sits left of the data so a row's lifecycle phase is the first
 * cue a user sees.
 */
export const STAGED_INV_ROW_LAYOUT: GridLayout<StagedInvGridRow> = {
  leadingControls: [
    { key: "select", kind: "selection", width: 40 },
    { key: "actions", kind: "actions", width: 96 },
  ],
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
}
