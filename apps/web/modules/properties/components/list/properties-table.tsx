"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import type { PropertyListRow } from "@builders/domain"

const PROPERTIES_LIST_LAYOUT: GridLayout<PropertyListRow> = {
  dataColumns: [
    { key: "name", label: "Property", minWidth: 180, grow: 1 },
    { key: "managementCompany", label: "Management Company", minWidth: 180, grow: 1 },
    { key: "streetAddress", label: "Street", minWidth: 160, grow: 1 },
    { key: "city", label: "City", minWidth: 120, grow: 0 },
    { key: "state", label: "State", minWidth: 70, grow: 0 },
    { key: "zip", label: "Zip", minWidth: 80, grow: 0 },
    { key: "phone", label: "Phone", minWidth: 130, grow: 0 },
    { key: "email", label: "Email", minWidth: 180, grow: 1 },
    { key: "templateCount", label: "Templates", kind: "number", minWidth: 90, grow: 0, align: "end" },
  ],
}

export type PropertiesTableProps = {
  rows: PropertyListRow[]
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenProperty: (id: string) => void
}

export function PropertiesTable({
  rows,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenProperty,
}: PropertiesTableProps) {
  return (
    <Grid<PropertyListRow>
      rows={rows}
      layout={PROPERTIES_LIST_LAYOUT}
      empty={<GridEmpty>No properties found.</GridEmpty>}
      onRowClick={(row) => onOpenProperty(row.id)}
      getRowAriaLabel={(row) => `Open property ${row.name}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "name":
            return <span className="font-medium text-blue-500">{row.name}</span>
          case "managementCompany":
            return row.managementCompany?.name ?? "-"
          case "streetAddress":
            return row.streetAddress || "-"
          case "city":
            return row.city || "-"
          case "state":
            return row.state || "-"
          case "zip":
            return row.zip || "-"
          case "phone":
            return row.phone || "-"
          case "email":
            return row.email || "-"
          case "templateCount":
            return <span className="tabular-nums">{row.templateCount}</span>
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
