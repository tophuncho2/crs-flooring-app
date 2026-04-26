"use client"

import { Grid, GridEmpty, type GridColumn, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import type { TemplateListRow } from "@builders/domain"

const TEMPLATES_LIST_COLUMNS_BY_KEY: Record<string, GridColumn<TemplateListRow>> = {
  templateNumber: { key: "templateNumber", label: "Template #", minWidth: 130, grow: 0 },
  unitType: { key: "unitType", label: "Unit Type", minWidth: 130, grow: 0 },
  property: { key: "property", label: "Property", minWidth: 200, grow: 1 },
  managementCompany: { key: "managementCompany", label: "Management Company", minWidth: 200, grow: 1 },
  jobType: { key: "jobType", label: "Job Type", minWidth: 160, grow: 0 },
  warehouse: { key: "warehouse", label: "Warehouse", minWidth: 140, grow: 0 },
  description: { key: "description", label: "Description", minWidth: 280, grow: 1.5 },
  items: { key: "items", label: "Items", kind: "number", minWidth: 80, grow: 0, align: "end" },
}

export function TemplatesTable({
  rows,
  visibleColumns,
  pagination,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpen,
}: {
  rows: TemplateListRow[]
  visibleColumns: Array<{ key: string; label: string }>
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    previousPageHref: string
    nextPageHref: string
  }
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpen: (row: TemplateListRow) => void
}) {
  const dataColumns = visibleColumns
    .map((column) => TEMPLATES_LIST_COLUMNS_BY_KEY[column.key])
    .filter((column): column is GridColumn<TemplateListRow> => Boolean(column))

  const layout: GridLayout<TemplateListRow> = { dataColumns }

  return (
    <Grid<TemplateListRow>
      rows={rows}
      layout={layout}
      empty={<GridEmpty>No templates found.</GridEmpty>}
      onRowClick={(row) => onOpen(row)}
      getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "templateNumber":
            return <span className="font-medium text-blue-500">{row.templateNumber}</span>
          case "unitType":
            return row.unitType || "-"
          case "property":
            return row.propertyName || "-"
          case "managementCompany":
            return row.managementCompanyName || "-"
          case "jobType":
            return row.jobTypeName || "-"
          case "warehouse":
            return row.warehouseName || "-"
          case "description":
            return row.description || "-"
          case "items":
            return <span className="tabular-nums">{row.itemsCount}</span>
          default:
            return "-"
        }
      }}
      footerSlot={
        <PaginateControls
          page={pagination?.page ?? page}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? totalItems}
          totalPages={pagination?.totalPages ?? totalPages}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : onPreviousPage}
          onNextPage={pagination ? undefined : onNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      }
    />
  )
}
