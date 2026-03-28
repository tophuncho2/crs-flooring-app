"use client"

const DEFAULT_MINIMUM_COLUMNS = 8
const DEFAULT_COLUMN_WIDTH_REM = 9.5

export function buildDashboardListTableMinWidth(
  columnCount: number,
  options?: {
    minimumColumns?: number
    columnWidthRem?: number
  },
) {
  const minimumColumns = Math.max(1, options?.minimumColumns ?? DEFAULT_MINIMUM_COLUMNS)
  const effectiveColumnCount = Math.max(columnCount, minimumColumns)
  const columnWidthRem = options?.columnWidthRem ?? DEFAULT_COLUMN_WIDTH_REM

  return `max(100%, ${effectiveColumnCount * columnWidthRem}rem)`
}

