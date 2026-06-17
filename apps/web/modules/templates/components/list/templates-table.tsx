"use client"

import { ArrowLeftRight } from "lucide-react"
import { DataTable, type PaginateContract } from "@/engines/list-view"
import { RecordOptionsMenu } from "@/engines/common"
import type { TemplateListRow } from "@builders/domain"
import { TEMPLATES_LIST_COLUMNS } from "./table/templates-list-columns"
import { renderTemplateRowCell } from "./table/templates-row-cell"

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
      rows={rows}
      columns={TEMPLATES_LIST_COLUMNS}
      empty="No templates match these filters."
      onOpenRow={(row) => onOpen(row)}
      rowActions={(row) => (
        <RecordOptionsMenu
          ariaLabel={`Options for template ${row.templateNumber}`}
          heading="Template options"
          items={[
            {
              key: "sync-to-work-order",
              label: syncingId === row.id ? "Syncing…" : "Sync to Work Order",
              icon: <ArrowLeftRight size={14} aria-hidden="true" />,
              onClick: () => onSync(row.id),
              disabled: syncingId !== null,
            },
          ]}
        />
      )}
      getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
      renderCell={renderTemplateRowCell}
      pagination={pagination}
    />
  )
}
