"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { InviteListRow, UserRank } from "@builders/domain"

export type CreatedInvite = {
  id: string
  email: string
  rank: UserRank
  expiresAt: string
}

export async function createInviteRequest(email: string, rank: UserRank) {
  return requestJson<{ invite: CreatedInvite }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ email, rank })),
  })
}

export async function revokeInviteRequest(id: string) {
  return requestJson<{ ok: true }>(`/api/invites/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({})),
  })
}

export type { InviteListRow }
