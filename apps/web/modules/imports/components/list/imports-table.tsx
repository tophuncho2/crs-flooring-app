"use client"

import { DataTable, type PaginateContract, type TableOptionsConfig } from "@/engines/list-view"
import type { ImportRow } from "@builders/domain"
import { IMPORTS_LIST_COLUMNS } from "./table/imports-list-columns"
import { renderImportsRowCell } from "./table/imports-row-cell"

function formatImportNumber(value: number): string {
  return `IMP-${value}`
}

export function ImportsTable({
  rows,
  onOpenImport,
  tableOptions,
  pagination,
}: {
  rows: ImportRow[]
  onOpenImport: (id: string) => void
  /** Gutter TableOptions menu (the "IMP #" row-number search tab). */
  tableOptions?: TableOptionsConfig
  pagination?: PaginateContract
}) {
  return (
    <DataTable<ImportRow>
      rows={rows}
      columns={IMPORTS_LIST_COLUMNS}
      empty="No imports logged yet."
      onOpenRow={(row) => onOpenImport(row.id)}
      getRowAriaLabel={(row) => `Open import ${formatImportNumber(row.importNumber)}`}
      renderCell={renderImportsRowCell}
      tableOptions={tableOptions}
      pagination={pagination}
    />
  )
}
