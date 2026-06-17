"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { TemplateListRow } from "@builders/domain"
import { TEMPLATES_LIST_COLUMNS } from "./table/templates-list-columns"
import { renderTemplateRowCell } from "./table/templates-row-cell"

export function TemplatesTable({
  rows,
  onOpen,
  pagination,
}: {
  rows: TemplateListRow[]
  onOpen: (row: TemplateListRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<TemplateListRow>
      rows={rows}
      columns={TEMPLATES_LIST_COLUMNS}
      empty="No templates match these filters."
      onOpenRow={(row) => onOpen(row)}
      getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
      renderCell={renderTemplateRowCell}
      pagination={pagination}
    />
  )
}
