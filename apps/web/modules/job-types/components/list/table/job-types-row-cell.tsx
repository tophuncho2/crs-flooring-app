import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type JobTypeListRow } from "@builders/domain"

export function renderJobTypeRowCell(
  column: DataTableColumn<JobTypeListRow>,
  row: JobTypeListRow,
): ReactNode {
  switch (column.key) {
    case "jobTypeNumber":
      return <span className="font-medium tabular-nums">{row.jobTypeNumber}</span>
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    case "updatedAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
