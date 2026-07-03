"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { RecordDetailClientScaffoldContext } from "@/engines/record-view"
import { getClientErrorMessage } from "@/transport"
import type { Invite } from "@builders/domain"
import { revokeInviteRequest } from "@/modules/invites/data/mutations"
import { INVITES_LIST_QUERY_KEY } from "@/modules/invites/data/list-invites-request"

// The invite record view is read-only detail + a single Revoke (delete) action.
// Revoke catches its own error (the footer has no error slot) and, on success,
// invalidates the list and routes back.
export function useInvitePrimarySection({
  page,
  invite,
}: {
  page: RecordDetailClientScaffoldContext
  invite: Invite
}) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const revoke = useCallback(async () => {
    setError(null)
    try {
      await revokeInviteRequest(invite.id)
      await queryClient.invalidateQueries({ queryKey: [...INVITES_LIST_QUERY_KEY] })
      page.redirectToBack()
    } catch (revokeError) {
      setError(getClientErrorMessage(revokeError, "Could not revoke the invite."))
    }
  }, [invite.id, page, queryClient])

  return { error, revoke }
}
