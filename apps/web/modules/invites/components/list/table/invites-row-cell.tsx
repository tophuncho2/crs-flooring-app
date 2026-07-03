import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type InviteListRow } from "@builders/domain"
import { RANK_LABELS } from "@/modules/users/rank-presentation"

// Read-only list — rows navigate to the invite record view, where Revoke lives.
export function renderInviteRowCell(
  column: DataTableColumn<InviteListRow>,
  row: InviteListRow,
): ReactNode {
  switch (column.key) {
    case "email":
      return <span className="font-medium">{row.email}</span>
    case "rank":
      return <span>{RANK_LABELS[row.rank] ?? row.rank}</span>
    case "invitedBy":
      return <span>{row.invitedBy ?? "—"}</span>
    case "expiresAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.expiresAt) || "—"}</span>
    default:
      return "-"
  }
}
