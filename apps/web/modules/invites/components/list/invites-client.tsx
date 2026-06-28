"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  ListPageShell,
  ListHeaderPortal,
} from "@/engines/list-view"
import { LIST_INVITES_PAGE_SIZE, type InviteListRow, type UserRank } from "@builders/domain"
import { getClientErrorMessage } from "@/transport"
import { assignableRanks, RANK_LABELS } from "@/modules/users/rank-presentation"
import {
  INVITES_LIST_QUERY_KEY,
  listInvitesRequest,
} from "@/modules/invites/data/list-invites-request"
import {
  createInviteRequest,
  revokeInviteRequest,
} from "@/modules/invites/data/mutations"
import { InvitesTable } from "./invites-table"

export type InvitesClientProps = {
  initialPage: number
  actorRank: UserRank
  loginUrl: string
}

// Manager surface: create an invite (email + rank scoped to the actor) and revoke
// pending ones. There is no secret link — the invitee just signs in with Google,
// matched against their open invite row.
export default function InvitesClient({ initialPage, actorRank, loginUrl }: InvitesClientProps) {
  const queryClient = useQueryClient()
  const ranks = assignableRanks(actorRank)

  const [email, setEmail] = useState("")
  const [rank, setRank] = useState<UserRank>(ranks[ranks.length - 1] ?? actorRank)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  async function refreshList() {
    await queryClient.invalidateQueries({ queryKey: [...INVITES_LIST_QUERY_KEY] })
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const { invite } = await createInviteRequest(trimmed, rank)
      await refreshList()
      setEmail("")
      setSuccess(
        `Invited ${invite.email} as ${RANK_LABELS[invite.rank]}. Tell them to sign in with Google at ${loginUrl}.`,
      )
    } catch (createError) {
      setError(getClientErrorMessage(createError, "Could not create the invite."))
    } finally {
      setSubmitting(false)
    }
  }

  function handleRevoke(row: InviteListRow) {
    setBusyId(row.id)
    setError(null)
    setSuccess(null)
    void revokeInviteRequest(row.id)
      .then(refreshList)
      .catch((revokeError) => setError(getClientErrorMessage(revokeError, "Could not revoke the invite.")))
      .finally(() => setBusyId(null))
  }

  return (
    <ListPageShell>
      <ListHeaderPortal
        label="Invites"
        rowCount={rows.length}
        total={total}
        rowCountLabel="pending invites"
      />

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@crsfloorcovering.com"
            className="w-72 rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Rank</span>
          <select
            value={rank}
            onChange={(event) => setRank(event.target.value as UserRank)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1"
          >
            {ranks.map((option) => (
              <option key={option} value={option}>
                {RANK_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {submitting ? "Inviting…" : "Send invite"}
        </button>
      </form>

      {error ? (
        <p className="px-4 py-1 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="px-4 py-1 text-sm text-emerald-700" role="status">
          {success}
        </p>
      ) : null}

      <InvitesTable
        rows={rows}
        handlers={{ busyId, onRevoke: handleRevoke }}
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
