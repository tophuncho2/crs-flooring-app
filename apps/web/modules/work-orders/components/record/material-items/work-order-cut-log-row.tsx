"use client"

import { useMemo, type ReactNode } from "react"
import type { CutLogRow } from "@builders/domain"
import { renderCutLogReadOnlyCell } from "@/modules/cut-logs"
import { Grid, GridEmpty } from "@/components/grid"
import { CutLogRowToolbar } from "./toolbar-controls"
import { CutLogDuplicateButton } from "./row-controls/sub-controls"
import { WORK_ORDER_CUT_LOG_LAYOUT } from "./work-order-cut-log-row-layout"

export type WorkOrderCutLogRowProps = {
  workOrderItemId: string
  serverRows: ReadonlyArray<CutLogRow>
  /**
   * Parent WO's warehouse name. Passed to the shared cut-log cell renderer
   * as the `warehouseFallback` so the `warehouse` column renders on the WO
   * side too — WO-side rows are plain `CutLogRow` and don't carry a joined
   * `warehouseName`, and every row in this grid shares the parent WO's
   * warehouse by construction.
   */
  warehouseName: string
  /** Open the edit panel for a saved cut log. */
  onOpenEdit: (workOrderItemId: string, cutLog: CutLogRow) => void
  /** Open the edit panel in create mode for this WOMI. */
  onCreateNew: (workOrderItemId: string) => void
  /**
   * Open the create panel pre-seeded with the source row's inventory item.
   * UI-only affordance — does not invoke a duplicate use case, so no
   * inventory-balance recalculation runs until the operator saves.
   */
  onDuplicate: (workOrderItemId: string, cutLog: CutLogRow) => void
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
  warehouseName,
  onOpenEdit,
  onCreateNew,
  onDuplicate,
  isSectionBusy,
}: WorkOrderCutLogRowProps) {
  const rows = useMemo<CutLogRow[]>(() => [...serverRows], [serverRows])

  const renderCell = useMemo(
    () => renderCutLogReadOnlyCell({ warehouseFallback: warehouseName }),
    [warehouseName],
  )

  function renderControl(
    control: { key: string; kind: string },
    row: CutLogRow,
  ): ReactNode {
    if (control.kind === "actions") {
      return (
        <CutLogDuplicateButton
          isPending={row.status === "PENDING"}
          isSectionBusy={isSectionBusy}
          onClick={() => onDuplicate(workOrderItemId, row)}
        />
      )
    }
    return null
  }

  return (
    <div className="space-y-3 border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <Grid<CutLogRow>
        rows={rows}
        layout={WORK_ORDER_CUT_LOG_LAYOUT}
        empty={<GridEmpty>No cut logs yet.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderControl}
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
