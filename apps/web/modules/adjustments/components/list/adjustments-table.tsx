"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { ADJUSTMENTS_LIST_COLUMNS } from "./table/adjustments-list-columns"
import { renderAdjustmentsRowCell } from "./table/adjustments-row-cell"
import { renderAdjustmentRowActions } from "./table/adjustment-row-actions"

export function AdjustmentsTable({
  rows,
  onOpenAdjustment,
  onSplitOff,
  pagination,
}: {
  rows: EnrichedInventoryAdjustmentRow[]
  onOpenAdjustment: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Add inventory from adjustment": open the split-off create form. */
  onSplitOff: (row: EnrichedInventoryAdjustmentRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      rows={rows}
      columns={ADJUSTMENTS_LIST_COLUMNS}
      empty="No adjustments match these filters."
      onOpenRow={(row) => onOpenAdjustment(row)}
      rowActions={(row) => renderAdjustmentRowActions(row, { onSplitOff })}
      getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
      renderCell={renderAdjustmentsRowCell}
      pagination={pagination}
    />
  )
}
