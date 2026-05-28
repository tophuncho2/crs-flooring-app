"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { CUT_LOGS_LIST_COLUMNS } from "./table/cut-logs-list-columns"
import { renderCutLogsRowCell } from "./table/cut-logs-row-cell"

export function CutLogsTable({
  rows,
  onOpenCutLog,
  pagination,
}: {
  rows: EnrichedInventoryAdjustmentRow[]
  onOpenCutLog: (row: EnrichedInventoryAdjustmentRow) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      rows={rows}
      columns={CUT_LOGS_LIST_COLUMNS}
      empty="No cut logs match these filters."
      onRowClick={(row) => onOpenCutLog(row)}
      getRowAriaLabel={(row) => `Open cut log ${row.adjustmentNumber}`}
      renderCell={renderCutLogsRowCell}
      footerSlot={pagination}
    />
  )
}
