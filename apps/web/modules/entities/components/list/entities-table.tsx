"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { EntityListRow } from "@builders/domain"
import { ENTITIES_LIST_COLUMNS } from "./table/entities-list-columns"
import { renderEntityRowCell } from "./table/entities-row-cell"

export function EntitiesTable({
  rows,
  onOpenEntity,
  pagination,
}: {
  rows: EntityListRow[]
  onOpenEntity: (row: EntityListRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<EntityListRow>
      fill
      rows={rows}
      columns={ENTITIES_LIST_COLUMNS}
      empty="No entities match these filters."
      onOpenRow={(row) => onOpenEntity(row)}
      getRowAriaLabel={(row) => `Open entity ${row.entity}`}
      renderCell={renderEntityRowCell}
      pagination={pagination}
    />
  )
}
