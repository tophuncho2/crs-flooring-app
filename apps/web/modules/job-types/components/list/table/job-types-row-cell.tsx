import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import type { JobTypeListRow } from "@builders/domain"

function formatUpdatedAt(value: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString()
}

export function renderJobTypeRowCell(
  column: DataTableColumn<JobTypeListRow>,
  row: JobTypeListRow,
): ReactNode {
  switch (column.key) {
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "updatedAt":
      return <span className="tabular-nums">{formatUpdatedAt(row.updatedAt)}</span>
    default:
      return "-"
  }
}
