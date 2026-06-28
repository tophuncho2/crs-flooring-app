"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { UserListRow, UserRank } from "@builders/domain"

// Rank change uses optimistic concurrency — `updatedAt` is the revision token.
export async function updateUserRankRequest(
  id: string,
  rank: UserRank,
  updatedAt: string,
) {
  return requestJson<{ user: UserListRow }>(`/api/users/${id}/rank`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ rank }, updatedAt)),
  })
}

export async function setUserActiveRequest(id: string, isActive: boolean) {
  return requestJson<{ user: UserListRow }>(`/api/users/${id}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ isActive })),
  })
}
