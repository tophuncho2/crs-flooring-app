"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
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
  pagination?: PaginateContract
}) {
  return (
    <DataTable<PropertyListRow>
      fill
      rows={rows}
      columns={PROPERTIES_LIST_COLUMNS}
      empty="No properties match these filters."
      onOpenRow={(row) => onOpenProperty(row)}
      getRowAriaLabel={(row) => `Open property ${row.name}`}
      renderCell={renderPropertyRowCell}
      pagination={pagination}
    />
  )
}
