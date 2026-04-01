"use client"

import type { ReactNode } from "react"
import {
  EmbeddedPageTableShell,
  TableHead,
  TableHeaderCell,
} from "@/modules/shared/engines/list-view/table/table-shell"
import { buildDashboardListTableMinWidth } from "./dashboard-list-page-table-layout"

export type DashboardListPageColumn = {
  key: string
  label: ReactNode
  className?: string
}

export function DashboardListPageTable({
  minWidthClass,
  columnWidthRem,
  minimumColumns,
  columns,
  children,
  className,
}: {
  minWidthClass?: string
  columnWidthRem?: number
  minimumColumns?: number
  columns: DashboardListPageColumn[]
  children: ReactNode
  className?: string
}) {
  const tableMinWidth = minWidthClass
    ? undefined
    : buildDashboardListTableMinWidth(columns.length, {
        minimumColumns,
        columnWidthRem,
      })

  return (
    <EmbeddedPageTableShell minWidthClass={minWidthClass} tableStyle={tableMinWidth ? { minWidth: tableMinWidth } : undefined} className={className}>
      <TableHead>
        <tr>
          {columns.map((column) => (
            <TableHeaderCell key={column.key} className={column.className}>
              {column.label}
            </TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <tbody>{children}</tbody>
    </EmbeddedPageTableShell>
  )
}
