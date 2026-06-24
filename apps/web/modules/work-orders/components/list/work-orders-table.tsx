"use client"

import {
  DataTable,
  type DataTableColumnFilter,
  type PaginateContract,
  type TableOptionsConfig,
} from "@/engines/list-view"
import type { WorkOrderListRow } from "@builders/domain"
import {
  WORK_ORDERS_LIST_COLUMNS,
  renderWorkOrderRowCell,
  renderWorkOrderRowActions,
} from "@/modules/work-orders"

export function WorkOrdersTable({
  rows,
  onOpenWorkOrder,
  sorts,
  onSort,
  tableOptions,
  columnFilters,
  pagination,
}: {
  rows: WorkOrderListRow[]
  onOpenWorkOrder: (id: string) => void
  /** Active ordered sort (drives the header carets + priority badges). */
  sorts?: ReadonlyArray<{ field: string; direction: "asc" | "desc" }>
  /** Header click → re-sort by that column key (single-sort replace). */
  onSort?: (key: string) => void
  /** Gutter TableOptions menu (the multi-column "Sort" tab). */
  tableOptions?: TableOptionsConfig
  /** Per-column header filters (e.g. the Date funnel). */
  columnFilters?: Record<string, DataTableColumnFilter>
  pagination?: PaginateContract
}) {
  return (
    <DataTable<WorkOrderListRow>
      rows={rows}
      columns={WORK_ORDERS_LIST_COLUMNS}
      empty="No work orders match these filters."
      sorts={sorts}
      onSort={onSort}
      tableOptions={tableOptions}
      columnFilters={columnFilters}
      onOpenRow={(row) => onOpenWorkOrder(row.id)}
      getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
      renderCell={renderWorkOrderRowCell}
      rowActions={(row) => renderWorkOrderRowActions(row)}
      pagination={pagination}
    />
  )
}
