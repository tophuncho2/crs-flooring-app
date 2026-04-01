"use client"

import type { ReactNode } from "react"
import { RecordLinkedChildTableSection } from "./record-linked-child-table-section"

type LinkedRecordRow = {
  id: string
  title: string
  secondary?: string
}

export function LinkedRecordsSection({
  title,
  rows,
  emptyMessage,
  onOpenRow,
  actions,
  inlineCreate,
  loadingRowId,
}: {
  title: string
  rows: LinkedRecordRow[]
  emptyMessage: string
  onOpenRow: (rowId: string) => void
  actions?: ReactNode
  inlineCreate?: ReactNode
  loadingRowId?: string | null
}) {
  return (
    <RecordLinkedChildTableSection
      title={title}
      rows={rows.map((row) => ({
        id: row.id,
        primary: row.title,
        secondary: row.secondary,
      }))}
      emptyMessage={emptyMessage}
      onOpenRow={onOpenRow}
      actions={actions}
      inlineCreate={inlineCreate}
      loadingRowId={loadingRowId}
      contextHeader="Summary"
    />
  )
}
