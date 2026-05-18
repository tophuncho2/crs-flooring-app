"use client"

import { useMemo } from "react"
import type { CutLogRow } from "@builders/domain"
import { INVENTORY_CUT_LOG_LAYOUT, renderCutLogReadOnlyCell } from "@/modules/cut-logs"
import { Grid, GridEmpty } from "@/components/grid"
import { CutLogRowToolbar } from "./toolbar-controls"

export type WorkOrderCutLogRowProps = {
  workOrderItemId: string
  serverRows: ReadonlyArray<CutLogRow>
  /** Open the edit panel for a saved cut log. */
  onOpenEdit: (workOrderItemId: string, cutLog: CutLogRow) => void
  /** Open the edit panel in create mode for this WOMI. */
  onCreateNew: (workOrderItemId: string) => void
  /**
   * True when the parent material-items section is mid-save. Used to dim
   * the rows + disable the "+ Add Cut Log" button so the user can't open
   * the panel while a section save is in flight.
   */
  isSectionBusy: boolean
}

/**
 * Per-WOMI cut-log display. Pure read-only — every row is a click target
 * that opens the canonical right-anchored edit panel. The panel owns the
 * full control stack (edit, save, finalize, void, delete); this component
 * is just the list view.
 */
export function WorkOrderCutLogRow({
  workOrderItemId,
  serverRows,
  onOpenEdit,
  onCreateNew,
  isSectionBusy,
}: WorkOrderCutLogRowProps) {
  const rows = useMemo<CutLogRow[]>(() => [...serverRows], [serverRows])

  const renderCell = useMemo(() => renderCutLogReadOnlyCell({}), [])

  return (
    <div className="space-y-3 border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <Grid<CutLogRow>
        rows={rows}
        layout={INVENTORY_CUT_LOG_LAYOUT}
        empty={<GridEmpty>No cut logs yet.</GridEmpty>}
        renderCell={renderCell}
        onRowClick={(row) => onOpenEdit(workOrderItemId, row)}
        getRowAriaLabel={(row) => `Edit cut log ${row.cutLogNumber}`}
      />

      <CutLogRowToolbar
        workOrderItemId={workOrderItemId}
        isSectionBusy={isSectionBusy}
        onCreateNew={onCreateNew}
      />
    </div>
  )
}
