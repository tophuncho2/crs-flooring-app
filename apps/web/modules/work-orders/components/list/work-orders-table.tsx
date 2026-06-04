"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/engines/list-view"
import type { WorkOrderListRow } from "@builders/domain"
import { WORK_ORDERS_LIST_COLUMNS } from "./table/work-orders-list-columns"
import { renderWorkOrderRowCell } from "./table/work-orders-row-cell"

export function WorkOrdersTable({
  rows,
  onOpenWorkOrder,
  pagination,
}: {
  rows: WorkOrderListRow[]
  onOpenWorkOrder: (id: string) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<WorkOrderListRow>
      rows={rows}
      columns={WORK_ORDERS_LIST_COLUMNS}
      empty="No work orders match these filters."
      onRowClick={(row) => onOpenWorkOrder(row.id)}
      getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
      renderCell={renderWorkOrderRowCell}
      footerSlot={pagination}
    />
  )
}
