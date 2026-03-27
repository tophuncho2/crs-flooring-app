"use client"

import type { ReactNode } from "react"
import {
  EmbeddedPageTableShell,
  TableHead,
  TableHeaderCell,
} from "@/features/dashboard/shared/table/table-shell"

export type DashboardListPageColumn = {
  key: string
  label: ReactNode
  className?: string
}

export function DashboardListPageTable({
  minWidthClass,
  columns,
  children,
  className,
}: {
  minWidthClass: string
  columns: DashboardListPageColumn[]
  children: ReactNode
  className?: string
}) {
  return (
    <EmbeddedPageTableShell minWidthClass={minWidthClass} className={className}>
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
