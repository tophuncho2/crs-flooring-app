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

// Permanent delete — `updatedAt` is the optimistic-concurrency token. The row's
// sessions/accounts/receipts cascade at the DB level.
export async function deleteUserRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/users/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
