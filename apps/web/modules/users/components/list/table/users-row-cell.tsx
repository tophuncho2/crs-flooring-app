import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type UserListRow } from "@builders/domain"
import { RANK_LABELS } from "@/modules/users/rank-presentation"

// Read-only list — rows navigate to the user record view, where rank is edited
// and the user can be deleted. No inline controls.
export function renderUserRowCell(
  column: DataTableColumn<UserListRow>,
  row: UserListRow,
): ReactNode {
  switch (column.key) {
    case "email":
      return <span className="font-medium">{row.email}</span>
    case "rank":
      return <span>{RANK_LABELS[row.rank] ?? row.rank}</span>
    case "createdAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
    default:
      return "-"
  }
}
