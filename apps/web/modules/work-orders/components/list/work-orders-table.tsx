"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { WorkOrderListRow } from "@builders/domain"
import {
  WORK_ORDERS_LIST_COLUMNS,
  renderWorkOrderRowCell,
  renderWorkOrderRowActions,
} from "@/modules/work-orders"

export function WorkOrdersTable({
  rows,
  onOpenWorkOrder,
  sort,
  onSort,
  pagination,
}: {
  rows: WorkOrderListRow[]
  onOpenWorkOrder: (id: string) => void
  /** Active server-side sort (drives the header carets). */
  sort?: { field: string; direction: "asc" | "desc" } | null
  /** Header click → re-sort by that column key. */
  onSort?: (key: string) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<WorkOrderListRow>
      rows={rows}
      columns={WORK_ORDERS_LIST_COLUMNS}
      empty="No work orders match these filters."
      sort={sort}
      onSort={onSort}
      onOpenRow={(row) => onOpenWorkOrder(row.id)}
      getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
      renderCell={renderWorkOrderRowCell}
      rowActions={(row) => renderWorkOrderRowActions(row)}
      pagination={pagination}
    />
  )
}
