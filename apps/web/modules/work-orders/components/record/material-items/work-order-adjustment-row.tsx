"use client"

import { useMemo, type ReactNode } from "react"
import { Copy } from "lucide-react"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { renderAdjustmentReadOnlyCell } from "@/modules/adjustments"
import { Grid, GridEmpty } from "@/engines/record-view"
import { RecordOpenButton, RecordOptionsMenu } from "@/engines/common"
import { AdjustmentRowToolbar } from "./toolbar-controls"
import { WORK_ORDER_ADJUSTMENT_LAYOUT } from "./work-order-adjustment-row-layout"

// Mirrors the server order in listAdjustmentsForWorkOrderItemIds
// (packages/db/.../inventory/adjustments/read-repository.ts): quantity
// ascending, id as the deterministic tiebreaker. Sorting here — not only on
// the server load — keeps the grid correctly ordered after an in-place edit
// that changes a row's quantity (otherwise it only re-sorts on page refresh).
function compareAdjustmentsForDisplay(
  a: EnrichedInventoryAdjustmentRow,
  b: EnrichedInventoryAdjustmentRow,
): number {
  const byQuantity = Number(a.quantity) - Number(b.quantity)
  if (byQuantity !== 0) return byQuantity
  return a.id.localeCompare(b.id)
}

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
 * Per-WOMI adjustment display. Pure read-only — the row body is inert; each
 * row opens the canonical right-anchored edit panel via its leading open (↗)
 * gutter, and exposes a trailing options (⋮) menu carrying the duplicate
 * affordance. The panel owns the full control stack (edit, save, finalize,
 * void, delete); this component is just the list view.
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
  // hydration needed. Re-sort by quantity (id tiebreak) so the grid matches
  // the DB order even after an in-place mutation merge that changed a quantity.
  const rows = useMemo<EnrichedInventoryAdjustmentRow[]>(
    () => [...serverRows].sort(compareAdjustmentsForDisplay),
    [serverRows],
  )

  const renderCell = useMemo(() => renderAdjustmentReadOnlyCell({}), [])

  function renderControl(
    control: { key: string; kind: string },
    row: EnrichedInventoryAdjustmentRow,
  ): ReactNode {
    if (control.kind === "open") {
      return (
        <RecordOpenButton
          ariaLabel={`Edit adjustment ${row.adjustmentNumber}`}
          title="Open this adjustment"
          onClick={() => onOpenEdit(workOrderItemId, row)}
        />
      )
    }
    if (control.kind === "actions") {
      // Duplicate opens a new create form pre-seeded with this row's inventory
      // item (UI-only, no duplicate use case). Enabled only for PENDING rows;
      // QUEUED / FINAL / VOID and any in-flight section save disable it.
      const isPending = row.status === "PENDING"
      return (
        <RecordOptionsMenu
          ariaLabel={`Options for adjustment ${row.adjustmentNumber}`}
          items={[
            {
              key: "duplicate",
              label: "Duplicate adjustment",
              icon: <Copy size={14} aria-hidden="true" />,
              onClick: () => onDuplicate(workOrderItemId, row),
              disabled: !isPending || isSectionBusy,
            },
          ]}
        />
      )
    }
    return null
  }

  return (
    <div className="w-0 min-w-full space-y-3 border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <Grid<EnrichedInventoryAdjustmentRow>
        rows={rows}
        layout={WORK_ORDER_ADJUSTMENT_LAYOUT}
        empty={<GridEmpty>No adjustments yet.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderControl}
      />

      <AdjustmentRowToolbar
        workOrderItemId={workOrderItemId}
        isSectionBusy={isSectionBusy}
        onCreateNew={onCreateNew}
      />
    </div>
  )
}
