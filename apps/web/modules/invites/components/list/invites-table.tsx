"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { InviteListRow } from "@builders/domain"
import { INVITES_LIST_COLUMNS } from "./table/invites-list-columns"
import {
  createInviteRowCellRenderer,
  type InviteRowCellHandlers,
} from "./table/invites-row-cell"

export function InvitesTable({
  rows,
  pagination,
  handlers,
}: {
  rows: InviteListRow[]
  pagination?: PaginateContract
  handlers: InviteRowCellHandlers
}) {
  return (
    <DataTable<InviteListRow>
      rows={rows}
      columns={INVITES_LIST_COLUMNS}
      empty="No pending invites."
      renderCell={createInviteRowCellRenderer(handlers)}
      pagination={pagination}
    />
  )
}
