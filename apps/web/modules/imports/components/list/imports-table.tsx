"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { ImportRow } from "@builders/domain"
import { IMPORTS_LIST_COLUMNS } from "./table/imports-list-columns"
import { renderImportsRowCell } from "./table/imports-row-cell"

function formatImportNumber(value: number): string {
  return `IMP-${String(value).padStart(4, "0")}`
}

export function ImportsTable({
  rows,
  onOpenImport,
  pagination,
}: {
  rows: ImportRow[]
  onOpenImport: (id: string) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<ImportRow>
      rows={rows}
      columns={IMPORTS_LIST_COLUMNS}
      empty="No imports logged yet."
      onRowClick={(row) => onOpenImport(row.id)}
      getRowAriaLabel={(row) => `Open import ${formatImportNumber(row.importNumber)}`}
      renderCell={renderImportsRowCell}
      footerSlot={pagination}
    />
  )
}
