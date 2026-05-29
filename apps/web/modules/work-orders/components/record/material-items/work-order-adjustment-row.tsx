"use client"

import { useMemo, type ReactNode } from "react"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { renderAdjustmentReadOnlyCell } from "@/modules/adjustments"
import { Grid, GridEmpty } from "@/components/grid"
import { AdjustmentRowToolbar } from "./toolbar-controls"
import { AdjustmentDuplicateButton } from "./row-controls/sub-controls"
import { WORK_ORDER_ADJUSTMENT_LAYOUT } from "./work-order-adjustment-row-layout"

export type WorkOrderAdjustmentRowProps = {
  workOrderItemId: string
  /**
   * Enriched WO-linked adjustments (each carries its own warehouse name + WO
   * number per row, correct under cross-warehouse sourcing). Rendered with the
   * full ledger column set.
   */
  serverRows: ReadonlyArray<EnrichedInventoryAdjustmentRow>
  /** Open the edit panel for a saved adjustment. */
  onOpenEdit: (workOrderItemId: string, adjustment: EnrichedInventoryAdjustmentRow) => void
  /** Open the edit panel in create mode for this WOMI. */
  onCreateNew: (workOrderItemId: string) => void
  /**
   * Open the create panel pre-seeded with the source row's inventory item.
   * UI-only affordance — does not invoke a duplicate use case, so no
   * inventory-balance recalculation runs until the operator saves.
   */
  onDuplicate: (workOrderItemId: string, adjustment: EnrichedInventoryAdjustmentRow) => void
  /**
   * True when the parent material-items section is mid-save. Used to dim
   * the rows + disable the "+ Add Adjustment" button so the user can't open
   * the panel while a section save is in flight.
   */
  isSectionBusy: boolean
}

/**
 * Per-WOMI adjustment display. Pure read-only — every row is a click target
 * that opens the canonical right-anchored edit panel. The panel owns the
 * full control stack (edit, save, finalize, void, delete); this component
 * is just the list view.
 */
export function WorkOrderAdjustmentRow({
  workOrderItemId,
  serverRows,
  onOpenEdit,
  onCreateNew,
  onDuplicate,
  isSectionBusy,
}: WorkOrderAdjustmentRowProps) {
  // Rows arrive enriched (own warehouse name + WO number per row) — no
  // hydration needed; pass straight to the grid.
  const rows = useMemo<EnrichedInventoryAdjustmentRow[]>(() => [...serverRows], [serverRows])

  const renderCell = useMemo(() => renderAdjustmentReadOnlyCell({}), [])

  function renderControl(
    control: { key: string; kind: string },
    row: EnrichedInventoryAdjustmentRow,
  ): ReactNode {
    if (control.kind === "actions") {
      return (
        <AdjustmentDuplicateButton
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
      <Grid<EnrichedInventoryAdjustmentRow>
        rows={rows}
        layout={WORK_ORDER_ADJUSTMENT_LAYOUT}
        empty={<GridEmpty>No adjustments yet.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderControl}
        onRowClick={(row) => onOpenEdit(workOrderItemId, row)}
        getRowAriaLabel={(row) => `Edit adjustment ${row.adjustmentNumber}`}
      />

      <AdjustmentRowToolbar
        workOrderItemId={workOrderItemId}
        isSectionBusy={isSectionBusy}
        onCreateNew={onCreateNew}
      />
    </div>
  )
}
