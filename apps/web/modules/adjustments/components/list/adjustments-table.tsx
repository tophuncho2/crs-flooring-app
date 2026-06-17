"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { ADJUSTMENTS_LIST_COLUMNS } from "./table/adjustments-list-columns"
import { renderAdjustmentsRowCell } from "./table/adjustments-row-cell"

export function AdjustmentsTable({
  rows,
  onOpenAdjustment,
  pagination,
}: {
  rows: EnrichedInventoryAdjustmentRow[]
  onOpenAdjustment: (row: EnrichedInventoryAdjustmentRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      rows={rows}
      columns={ADJUSTMENTS_LIST_COLUMNS}
      empty="No adjustments match these filters."
      onOpenRow={(row) => onOpenAdjustment(row)}
      getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
      renderCell={renderAdjustmentsRowCell}
      pagination={pagination}
    />
  )
}
