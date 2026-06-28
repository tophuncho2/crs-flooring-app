import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type InviteListRow } from "@builders/domain"
import { RANK_LABELS } from "@/modules/users/rank-presentation"

export type InviteRowCellHandlers = {
  busyId: string | null
  onRevoke: (row: InviteListRow) => void
}

export function createInviteRowCellRenderer(handlers: InviteRowCellHandlers) {
  const { busyId, onRevoke } = handlers

  return function renderInviteRowCell(
    column: DataTableColumn<InviteListRow>,
    row: InviteListRow,
  ): ReactNode {
    switch (column.key) {
      case "email":
        return <span className="font-medium">{row.email}</span>
      case "rank":
        return <span className="font-medium">{RANK_LABELS[row.rank] ?? row.rank}</span>
      case "invitedBy":
        return <span>{row.invitedBy ?? "—"}</span>
      case "expiresAt":
        return (
          <span className="tabular-nums">{formatEasternDateTime(row.expiresAt) || "—"}</span>
        )
      case "actions":
        return (
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            disabled={busyId === row.id}
            onClick={() => onRevoke(row)}
          >
            Revoke
          </button>
        )
      default:
        return "-"
    }
  }
}
