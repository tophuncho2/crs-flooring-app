"use client"

import type { ReactNode } from "react"
import { DashboardTableCell } from "@/features/dashboard/shared/table/table-shell"

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
