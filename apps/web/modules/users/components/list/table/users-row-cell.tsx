import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type UserListRow, type UserRank } from "@builders/domain"
import { assignableRanks, canEditRank, RANK_LABELS } from "@/modules/users/rank-presentation"

export type UserRowCellHandlers = {
  actorRank: UserRank
  actorId: string
  busyId: string | null
  onRankChange: (row: UserListRow, rank: UserRank) => void
  onToggleActive: (row: UserListRow) => void
}

// Factory: the user list is interactive (rank select + activation toggle), so the
// cell renderer closes over the actor context + mutation handlers from the client.
export function createUserRowCellRenderer(handlers: UserRowCellHandlers) {
  const { actorRank, actorId, busyId, onRankChange, onToggleActive } = handlers

  return function renderUserRowCell(
    column: DataTableColumn<UserListRow>,
    row: UserListRow,
  ): ReactNode {
    const editable = canEditRank(actorRank, row.rank)
    const busy = busyId === row.id

    switch (column.key) {
      case "email":
        return <span className="font-medium">{row.email}</span>
      case "rank": {
        if (!editable) {
          return <span className="font-medium">{RANK_LABELS[row.rank] ?? row.rank}</span>
        }
        return (
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
            value={row.rank}
            disabled={busy}
            onChange={(event) => onRankChange(row, event.target.value as UserRank)}
          >
            {assignableRanks(actorRank).map((rank) => (
              <option key={rank} value={rank}>
                {RANK_LABELS[rank]}
              </option>
            ))}
          </select>
        )
      }
      case "isActive":
        return (
          <span className={row.isActive ? "text-emerald-700" : "text-rose-700"}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        )
      case "createdAt":
        return (
          <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
        )
      case "actions": {
        const isSelf = row.id === actorId
        const blockDeactivateSelf = row.isActive && isSelf
        const disabled = busy || !editable || blockDeactivateSelf
        return (
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={disabled}
            onClick={() => onToggleActive(row)}
          >
            {row.isActive ? "Deactivate" : "Activate"}
          </button>
        )
      }
      default:
        return "-"
    }
  }
}
