"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { EntityTypeListRow } from "@builders/domain"
import { ENTITY_TYPES_LIST_COLUMNS } from "./table/entity-types-list-columns"
import { renderEntityTypeRowCell } from "./table/entity-types-row-cell"

export function EntityTypesTable({
  rows,
  onOpenEntityType,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: EntityTypeListRow[]
  onOpenEntityType: (row: EntityTypeListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<EntityTypeListRow>
      fill
      resizable
      rows={rows}
      columns={ENTITY_TYPES_LIST_COLUMNS}
      empty="No entity types match this search."
      onOpenRow={(row) => onOpenEntityType(row)}
      getRowAriaLabel={(row) => `Open entity type ${row.type}`}
      renderCell={renderEntityTypeRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
