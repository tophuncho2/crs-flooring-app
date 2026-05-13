"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import { formatStableDate } from "@builders/domain"
import type { WorkOrderListRow } from "@builders/domain"

const WORK_ORDERS_LIST_LAYOUT: GridLayout<WorkOrderListRow> = {
  dataColumns: [
    { key: "workOrderNumber", label: "WO #", minWidth: 110, grow: 0 },
    { key: "scheduledFor", label: "Date", minWidth: 110, grow: 0 },
    { key: "warehouseName", label: "Warehouse", minWidth: 140, grow: 1 },
    { key: "description", label: "Description", minWidth: 220, grow: 1.5 },
    { key: "propertyName", label: "Property", minWidth: 160, grow: 1 },
    { key: "templateNumber", label: "Template", minWidth: 110, grow: 0 },
    { key: "managementCompanyName", label: "Mgmt Co", minWidth: 140, grow: 1 },
    { key: "jobTypeName", label: "Job Type", minWidth: 120, grow: 0 },
    { key: "vacancy", label: "Vacancy", minWidth: 100, grow: 0 },
    { key: "unitNumber", label: "Unit #", minWidth: 90, grow: 0 },
    { key: "unitType", label: "Unit Type", minWidth: 110, grow: 0 },
    { key: "isComplete", label: "Complete", minWidth: 100, grow: 0 },
  ],
}

export function WorkOrdersTable({
  rows,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenWorkOrder,
}: {
  rows: WorkOrderListRow[]
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenWorkOrder: (id: string) => void
}) {
  return (
    <Grid<WorkOrderListRow>
      rows={rows}
      layout={WORK_ORDERS_LIST_LAYOUT}
      empty={<GridEmpty>No work orders yet.</GridEmpty>}
      onRowClick={(row) => onOpenWorkOrder(row.id)}
      getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "workOrderNumber":
            return <span className="font-medium text-blue-500">{row.workOrderNumber}</span>
          case "scheduledFor":
            return row.scheduledFor ? formatStableDate(row.scheduledFor) : "-"
          case "warehouseName":
            return row.warehouseName || "-"
          case "description":
            return row.description || "-"
          case "propertyName":
            return row.propertyName || "-"
          case "templateNumber":
            return row.templateNumber || "-"
          case "managementCompanyName":
            return row.managementCompanyName || "-"
          case "jobTypeName":
            return row.jobTypeName || "-"
          case "vacancy":
            return row.vacancy ?? "-"
          case "unitNumber":
            return row.unitNumber || "-"
          case "unitType":
            return row.unitType || "-"
          case "isComplete":
            return row.isComplete ? "Complete" : "—"
          default:
            return "-"
        }
      }}
      footerSlot={
        <PaginateControls
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
        />
      }
    />
  )
}
