"use client"

import type { ReactNode } from "react"
import {
  ClickableTableRow,
  TableEmptyRow,
  TableHeaderCell,
} from "@/features/dashboard/shared/table/table-shell"
import {
  ModalTableHead,
  RecordChildTableSection,
} from "@/features/dashboard/shared/record-view/child-tables/record-child-table-shell"

export type RecordLinkedChildTableRow = {
  id: string
  primary: ReactNode
  secondary?: ReactNode
  context?: ReactNode
}

export function RecordLinkedChildTableSection({
  title,
  rows,
  emptyMessage,
  onOpenRow,
  actions,
  inlineCreate,
  loadingRowId,
  primaryHeader = "Record",
  contextHeader = "Details",
  openHeader = "Open",
}: {
  title: string
  rows: RecordLinkedChildTableRow[]
  emptyMessage: string
  onOpenRow: (rowId: string) => void
  actions?: ReactNode
  inlineCreate?: ReactNode
  loadingRowId?: string | null
  primaryHeader?: string
  contextHeader?: string
  openHeader?: string
}) {
  return (
    <RecordChildTableSection
      title={title}
      actions={actions}
      beforeTable={inlineCreate}
      minWidthClass="min-w-full"
    >
      <ModalTableHead>
        <tr>
          <TableHeaderCell>{primaryHeader}</TableHeaderCell>
          <TableHeaderCell>{contextHeader}</TableHeaderCell>
          <TableHeaderCell className="w-24">{openHeader}</TableHeaderCell>
        </tr>
      </ModalTableHead>
      <tbody>
        {rows.length === 0 ? (
          <TableEmptyRow message={emptyMessage} colSpan={3} />
        ) : (
          rows.map((row) => (
            <ClickableTableRow
              key={row.id}
              onClick={() => onOpenRow(row.id)}
              ariaLabel={`Open ${typeof row.primary === "string" ? row.primary : "linked record"}`}
            >
              <td className="px-3 py-3">
                <div className="min-w-0">
                  <div className="font-medium">{row.primary}</div>
                  {row.secondary ? (
                    <div className="mt-1 text-sm text-[var(--foreground)]/70">{row.secondary}</div>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-3 text-sm text-[var(--foreground)]/70">{row.context ?? "—"}</td>
              <td className="px-3 py-3 text-sm text-blue-500">
                {loadingRowId === row.id ? "Loading..." : "Open"}
              </td>
            </ClickableTableRow>
          ))
        )}
      </tbody>
    </RecordChildTableSection>
  )
}
