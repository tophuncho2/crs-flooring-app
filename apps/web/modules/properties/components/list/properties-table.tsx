"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { PropertyListRow } from "@builders/domain"
import { PROPERTIES_LIST_COLUMNS } from "./table/properties-list-columns"
import { renderPropertyRowCell } from "./table/properties-row-cell"

export function PropertiesTable({
  rows,
  onOpenProperty,
  pagination,
}: {
  rows: PropertyListRow[]
  onOpenProperty: (row: PropertyListRow) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<PropertyListRow>
      rows={rows}
      columns={PROPERTIES_LIST_COLUMNS}
      empty="No properties match these filters."
      onRowClick={(row) => onOpenProperty(row)}
      getRowAriaLabel={(row) => `Open property ${row.name}`}
      renderCell={renderPropertyRowCell}
      footerSlot={pagination}
    />
  )
}
