"use client"

import { DataTable, type PaginateContract, type TableOptionsConfig } from "@/engines/list-view"
import type { EntityTypeListRow } from "@builders/domain"
import { ENTITY_TYPES_LIST_COLUMNS } from "./table/entity-types-list-columns"
import { renderEntityTypeRowCell } from "./table/entity-types-row-cell"

export function EntityTypesTable({
  rows,
  onOpenEntityType,
  tableOptions,
  pagination,
}: {
  rows: EntityTypeListRow[]
  onOpenEntityType: (row: EntityTypeListRow) => void
  /** Gutter TableOptions menu (the "ET #" row-number search tab). */
  tableOptions?: TableOptionsConfig
  pagination?: PaginateContract
}) {
  return (
    <DataTable<EntityTypeListRow>
      rows={rows}
      columns={ENTITY_TYPES_LIST_COLUMNS}
      empty="No entity types match this search."
      tableOptions={tableOptions}
      onOpenRow={(row) => onOpenEntityType(row)}
      getRowAriaLabel={(row) => `Open entity type ${row.type}`}
      renderCell={renderEntityTypeRowCell}
      pagination={pagination}
    />
  )
}
