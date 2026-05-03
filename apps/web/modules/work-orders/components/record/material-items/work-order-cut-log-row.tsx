"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { formatInventoryRefPackage, type CutLogRow } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { renderCutLogReadOnlyCell } from "@/components/features/cut-log-row"
import { Grid, GridEmpty } from "@/components/grid"
import { listEligibleInventoryRequest } from "@/modules/work-orders/data/mutations"
import { WO_CUT_LOG_LAYOUT, type CutLogGridRow } from "./cut-log-row-layout"

type InventoryLabelData = {
  inventoryNumber: string
  itemNumber: string
  dyeLot: string
  notes: string
}

export type WorkOrderCutLogRowProps = {
  workOrderId: string
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
  workOrderId,
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

  // Cut logs only store `inventoryId`; build a label map from the eligible
  // inventory endpoint so the Inventory column shows the full
  // "INV# - itemNumber - dyeLot - notes" package instead of a raw UUID.
  // Inventory rows depleted since this cut log was recorded won't appear in
  // the eligible list — those fall back to the raw id.
  const [inventoryLabels, setInventoryLabels] = useState<Map<string, InventoryLabelData>>(
    () => new Map(),
  )
  useEffect(() => {
    let cancelled = false
    listEligibleInventoryRequest({ workOrderId, workOrderItemId })
      .then(({ inventories }) => {
        if (cancelled) return
        const map = new Map<string, InventoryLabelData>()
        for (const inv of inventories) {
          map.set(inv.id, {
            inventoryNumber: inv.inventoryNumber,
            itemNumber: inv.itemNumber,
            dyeLot: inv.dyeLot,
            notes: inv.notes,
          })
        }
        setInventoryLabels(map)
      })
      .catch(() => {
        // Silent — cells fall back to raw inventoryId.
      })
    return () => {
      cancelled = true
    }
  }, [workOrderId, workOrderItemId])

  const renderReadOnlyCell = useMemo(() => renderCutLogReadOnlyCell({}), [])

  function renderCell(column: { key: string }, gridRow: CutLogGridRow): ReactNode {
    const { cutLog } = gridRow
    if (column.key === "status") return <CutLogStatusBadge status={cutLog.status} />
    if (column.key === "inventoryRef") {
      const label = inventoryLabels.get(cutLog.inventoryId)
      const display = label ? formatInventoryRefPackage(label) : cutLog.inventoryId
      return <span className="truncate text-sm">{display}</span>
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
