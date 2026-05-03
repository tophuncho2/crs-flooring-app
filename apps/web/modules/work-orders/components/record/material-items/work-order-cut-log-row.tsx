"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"
import type { CutLogRow } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { renderCutLogReadOnlyCell } from "@/components/features/cut-log-row"
import { Grid, GridEmpty } from "@/components/grid"
import { WO_CUT_LOG_LAYOUT, type CutLogGridRow } from "./cut-log-row-layout"

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
  const gridRows: CutLogGridRow[] = useMemo(
    () => serverRows.map((cutLog) => ({ id: cutLog.id, cutLog })),
    [serverRows],
  )

  const renderReadOnlyCell = useMemo(() => renderCutLogReadOnlyCell({}), [])

  function renderCell(column: { key: string }, gridRow: CutLogGridRow): ReactNode {
    const { cutLog } = gridRow
    if (column.key === "status") return <CutLogStatusBadge status={cutLog.status} />
    if (column.key === "inventoryRef") {
      // Inventory column shows the stored inventoryId — the panel can show
      // the enriched label using its eligible-inventory load. Section-level
      // display keeps it simple to avoid an extra fetch per row.
      return <span className="truncate text-sm">{cutLog.inventoryId}</span>
    }
    return renderReadOnlyCell(column, cutLog)
  }

  return (
    <div className="space-y-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Cut Logs</span>
        <span className="text-[var(--foreground)]/55">
          {gridRows.length} row{gridRows.length === 1 ? "" : "s"}
        </span>
      </div>

      <Grid<CutLogGridRow>
        rows={gridRows}
        layout={WO_CUT_LOG_LAYOUT}
        empty={<GridEmpty>No cut logs yet.</GridEmpty>}
        renderCell={renderCell}
        onRowClick={(row) => onOpenEdit(workOrderItemId, row.cutLog)}
        getRowAriaLabel={(row) => `Edit cut log ${row.cutLog.cutLogNumber}`}
      />

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onCreateNew(workOrderItemId)}
          disabled={isSectionBusy}
        >
          + Add Cut Log
        </button>
      </div>
    </div>
  )
}
