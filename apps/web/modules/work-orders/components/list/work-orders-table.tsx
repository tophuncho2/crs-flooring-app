"use client"

import { DataTable, type ListSelection, type PaginateContract } from "@/engines/list-view"
import type { WorkOrderListRow } from "@builders/domain"
import {
  WORK_ORDERS_LIST_COLUMNS,
  renderWorkOrderRowCell,
  renderWorkOrderRowActions,
} from "@/modules/work-orders"

export function WorkOrdersTable({
  rows,
  onOpenWorkOrder,
  selection,
  pagination,
}: {
  rows: WorkOrderListRow[]
  onOpenWorkOrder: (id: string) => void
  /** Row-selection state — drives the checkbox column + Select-All (CSV export scope). */
  selection?: ListSelection
  pagination?: PaginateContract
}) {
  return (
    <DataTable<WorkOrderListRow>
      rows={rows}
      columns={WORK_ORDERS_LIST_COLUMNS}
      empty="No work orders match these filters."
      selection={
        selection
          ? {
              selectedIds: selection.selectedIds,
              onToggleRow: selection.toggle,
            }
          : undefined
      }
      onOpenRow={(row) => onOpenWorkOrder(row.id)}
      getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
      renderCell={renderWorkOrderRowCell}
      rowActions={(row) => renderWorkOrderRowActions(row)}
      pagination={pagination}
    />
  )
}
