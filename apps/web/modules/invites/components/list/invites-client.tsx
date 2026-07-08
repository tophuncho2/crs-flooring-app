"use client"

import {
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  ListPageShell,
  ListHeaderPortal,
  ListCreateButtonPortal,
} from "@/engines/list-view"
import { LIST_INVITES_PAGE_SIZE, type InviteListRow } from "@builders/domain"
import {
  INVITES_LIST_QUERY_KEY,
  listInvitesRequest,
} from "@/modules/invites/data/list-invites-request"
import { useInvitesListController } from "@/modules/invites/controllers/list/use-invites-list-controller"
import { InvitesTable } from "./invites-table"

export type InvitesClientProps = {
  initialPage: number
}

// Read-only list — "Invite" opens the create flow; rows open the invite record
// view, where Revoke lives. No mutations happen here.
export default function InvitesClient({ initialPage }: InvitesClientProps) {
  const { openInvite, openCreate } = useInvitesListController()

  const {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
  } = useFetchListController<InviteListRow, Record<string, never>>({
    mode: "fetch",
    queryKey: [...INVITES_LIST_QUERY_KEY],
    listFn: listInvitesRequest,
    initialPage,
    pageSize: LIST_INVITES_PAGE_SIZE,
    tableKey: "invites-main",
    freshness: LIST_FRESHNESS_STANDARD,
  })

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Invite" onClick={() => openCreate()} />
      <ListHeaderPortal
        label="Invites"
        rowCount={rows.length}
        total={total}
        rowCountLabel="pending invites"
      />
      <InvitesTable
        rows={rows}
        onOpenInvite={(row) => openInvite(row.id)}
        pagination={{
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasPreviousPage,
          hasNextPage,
          onPreviousPage: goToPreviousPage,
          onNextPage: goToNextPage,
        }}
      />
    </ListPageShell>
  )
}
