"use client"

import type { ReactNode } from "react"

export function renderDashboardRowCells<TColumn extends { key: string }>(
  visibleColumns: TColumn[],
  cells: Record<string, (columnIndex: number) => ReactNode>,
) {
  return visibleColumns.map((column, columnIndex) => cells[column.key](columnIndex))
}
