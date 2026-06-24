import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type UserListRow, type UserRank } from "@builders/domain"

const RANK_LABELS: Record<UserRank, string> = {
  DEVELOPER: "Developer",
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
}

export function renderUserRowCell(
  column: DataTableColumn<UserListRow>,
  row: UserListRow,
): ReactNode {
  switch (column.key) {
    case "email":
      return <span className="font-medium">{row.email}</span>
    case "rank":
      return <span className="font-medium">{RANK_LABELS[row.rank] ?? row.rank}</span>
    case "isVerified":
      return <span>{row.isVerified ? "Yes" : "No"}</span>
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
