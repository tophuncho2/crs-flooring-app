"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/engines/list-view"
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
  pagination?: ReactNode
}) {
  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      rows={rows}
      columns={ADJUSTMENTS_LIST_COLUMNS}
      empty="No adjustments match these filters."
      onOpenRow={(row) => onOpenAdjustment(row)}
      getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
      renderCell={renderAdjustmentsRowCell}
      footerSlot={pagination}
    />
  )
}
