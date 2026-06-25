"use client"

import { DataTable, type PaginateContract, type TableOptionsConfig } from "@/engines/list-view"
import type { PropertyListRow } from "@builders/domain"
import { PROPERTIES_LIST_COLUMNS } from "./table/properties-list-columns"
import { renderPropertyRowCell } from "./table/properties-row-cell"

export function PropertiesTable({
  rows,
  onOpenProperty,
  tableOptions,
  pagination,
}: {
  rows: PropertyListRow[]
  onOpenProperty: (row: PropertyListRow) => void
  /** Gutter TableOptions menu (the "PROP #" row-number search tab). */
  tableOptions?: TableOptionsConfig
  pagination?: PaginateContract
}) {
  return (
    <DataTable<PropertyListRow>
      rows={rows}
      columns={PROPERTIES_LIST_COLUMNS}
      empty="No properties match these filters."
      onOpenRow={(row) => onOpenProperty(row)}
      getRowAriaLabel={(row) => `Open property ${row.name}`}
      renderCell={renderPropertyRowCell}
      tableOptions={tableOptions}
      pagination={pagination}
    />
  )
}
