"use client"

import type { ReactNode } from "react"
import { CollapsibleTableSection } from "@/features/flooring/shared/ui/table/collapsible-table-section"

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
    <CollapsibleTableSection title={title} actions={actions} defaultOpen>
      <div className="space-y-4">
        {inlineCreate}

        <div className="rounded-xl border border-[var(--panel-border)]">
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">{emptyMessage}</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onOpenRow(row.id)}
                className="flex w-full items-center justify-between border-t border-[var(--panel-border)] px-4 py-3 text-left first:border-t-0 hover:bg-[var(--panel-hover)]"
              >
                <div className="min-w-0">
                  <p className="font-medium">{row.title}</p>
                  {row.secondary ? <p className="text-sm text-[var(--foreground)]/70">{row.secondary}</p> : null}
                </div>
                <span className="shrink-0 text-sm text-blue-500">
                  {loadingRowId === row.id ? "Loading..." : "View"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </CollapsibleTableSection>
  )
}
