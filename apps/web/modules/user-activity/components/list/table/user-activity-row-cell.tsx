import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import {
  formatEasternDateTime,
  type UserLoginActivityListRow,
} from "@builders/domain"

export function renderUserActivityRowCell(
  column: DataTableColumn<UserLoginActivityListRow>,
  row: UserLoginActivityListRow,
): ReactNode {
  switch (column.key) {
    case "userEmail":
      return <span className="font-medium">{row.userEmail}</span>
    case "loggedInAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.loggedInAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
