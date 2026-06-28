"use client"

import { DataTable, type ListSelection, type PaginateContract } from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { ADJUSTMENTS_LIST_COLUMNS } from "./table/adjustments-list-columns"
import { renderAdjustmentsRowCell } from "./table/adjustments-row-cell"
import { renderAdjustmentRowActions } from "./table/adjustment-row-actions"

export function AdjustmentsTable({
  rows,
  onOpenAdjustment,
  onSplitOff,
  selection,
  pagination,
}: {
  rows: EnrichedInventoryAdjustmentRow[]
  onOpenAdjustment: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Add inventory from adjustment": open the split-off create form. */
  onSplitOff: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row-selection state — drives the checkbox column + Select-All (CSV export scope). */
  selection?: ListSelection
  pagination?: PaginateContract
}) {
  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      rows={rows}
      columns={ADJUSTMENTS_LIST_COLUMNS}
      empty="No adjustments match these filters."
      selection={
        selection
          ? {
              selectedIds: selection.selectedIds,
              onToggleRow: selection.toggle,
            }
          : undefined
      }
      onOpenRow={(row) => onOpenAdjustment(row)}
      rowActions={(row) => renderAdjustmentRowActions(row, { onSplitOff })}
      getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
      renderCell={renderAdjustmentsRowCell}
      pagination={pagination}
    />
  )
}
