"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import type { TemplateListRow } from "@builders/domain"

const TEMPLATES_LIST_LAYOUT: GridLayout<TemplateListRow> = {
  dataColumns: [
    { key: "templateNumber", label: "Template #", minWidth: 130, grow: 0 },
    { key: "unitType", label: "Unit Type", minWidth: 130, grow: 0 },
    { key: "property", label: "Property", minWidth: 200, grow: 1 },
    { key: "managementCompany", label: "Management Company", minWidth: 200, grow: 1 },
    { key: "jobType", label: "Job Type", minWidth: 160, grow: 0 },
    { key: "warehouse", label: "Warehouse", minWidth: 140, grow: 0 },
    { key: "description", label: "Description", minWidth: 280, grow: 1.5 },
    { key: "items", label: "Items", kind: "number", minWidth: 80, grow: 0, align: "end" },
  ],
}

export function TemplatesTable({
  rows,
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
  return (
    <Grid<TemplateListRow>
      rows={rows}
      layout={TEMPLATES_LIST_LAYOUT}
      empty={<GridEmpty>No templates match these filters.</GridEmpty>}
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
