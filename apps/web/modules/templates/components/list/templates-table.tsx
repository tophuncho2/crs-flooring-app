"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { TemplateListRow } from "@builders/domain"
import { TEMPLATES_LIST_COLUMNS } from "./table/templates-list-columns"
import { renderTemplateRowCell } from "./table/templates-row-cell"
import { TemplateSyncRowOptions } from "./template-sync-row-options"

export function TemplatesTable({
  rows,
  onOpen,
  onSync,
  syncingId,
  pagination,
}: {
  rows: TemplateListRow[]
  onOpen: (row: TemplateListRow) => void
  /** Spin a work order from the row's template (mirrors the record-view action). */
  onSync: (id: string) => void
  /** The template currently syncing (disables every row's item while in flight). */
  syncingId: string | null
  pagination?: PaginateContract
}) {
  return (
    <DataTable<TemplateListRow>
      fill
      resizable
      rows={rows}
      columns={TEMPLATES_LIST_COLUMNS}
      empty="No templates match these filters."
      onOpenRow={(row) => onOpen(row)}
      rowActions={(row) => (
        <TemplateSyncRowOptions row={row} syncingId={syncingId} onSync={onSync} />
      )}
      getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
      renderCell={renderTemplateRowCell}
      pagination={pagination}
    />
  )
}
