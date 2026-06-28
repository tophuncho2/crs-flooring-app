"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  ListPageShell,
  ListHeaderPortal,
} from "@/engines/list-view"
import { LIST_USERS_PAGE_SIZE, type UserListRow, type UserRank } from "@builders/domain"
import { getClientErrorMessage } from "@/transport"
import {
  USERS_LIST_QUERY_KEY,
  listUsersRequest,
} from "@/modules/users/data/list-users-request"
import {
  setUserActiveRequest,
  updateUserRankRequest,
} from "@/modules/users/data/mutations"
import { UsersTable } from "./users-table"

export type UsersClientProps = {
  initialPage: number
  actorId: string
  actorRank: UserRank
}

// Interactive surface: rank select + activation toggle per row. Mutations
// invalidate the list query so the table reflects the new state (and any revoked
// sessions) on refetch.
export default function UsersClient({ initialPage, actorId, actorRank }: UsersClientProps) {
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
  } = useFetchListController<UserListRow, Record<string, never>>({
    mode: "fetch",
    queryKey: [...USERS_LIST_QUERY_KEY],
    listFn: listUsersRequest,
    initialPage,
    pageSize: LIST_USERS_PAGE_SIZE,
    tableKey: "users-main",
    freshness: LIST_FRESHNESS_STANDARD,
  })

  async function runMutation(id: string, mutate: () => Promise<unknown>) {
    setBusyId(id)
    setError(null)
    try {
      await mutate()
      await queryClient.invalidateQueries({ queryKey: [...USERS_LIST_QUERY_KEY] })
    } catch (mutationError) {
      setError(getClientErrorMessage(mutationError, "Could not update the user."))
    } finally {
      setBusyId(null)
    }
  }

  function handleRankChange(row: UserListRow, rank: UserRank) {
    if (rank === row.rank) return
    void runMutation(row.id, () => updateUserRankRequest(row.id, rank, row.updatedAt))
  }

  function handleToggleActive(row: UserListRow) {
    void runMutation(row.id, () => setUserActiveRequest(row.id, !row.isActive))
  }

  return (
    <ListPageShell>
      <ListHeaderPortal
        label="Users"
        rowCount={rows.length}
        total={total}
        rowCountLabel="users"
      />
      {error ? (
        <p className="px-4 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      <UsersTable
        rows={rows}
        handlers={{
          actorRank,
          actorId,
          busyId,
          onRankChange: handleRankChange,
          onToggleActive: handleToggleActive,
        }}
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
