"use client"

import type { ReactNode } from "react"
import { DashboardTableCell } from "@/modules/shared/engines/list-view/table/table-shell"

export function DashboardListRowCell({
  children,
  columnIndex,
  className,
}: {
  children: ReactNode
  columnIndex: number
  className?: string
}) {
  return (
    <DashboardTableCell columnIndex={columnIndex} className={className}>
      {children}
    </DashboardTableCell>
  )
}
