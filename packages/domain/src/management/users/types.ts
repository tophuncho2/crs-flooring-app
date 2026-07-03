import { z } from "zod"
import type { UserRank } from "./rank.js"

// Row shape for the users list AND the mutation responses (rank change,
// activation). `updatedAt` is the optimistic-concurrency token the client echoes
// back on the next inline edit.
export type UserListRow = {
  id: string
  email: string
  rank: UserRank
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// The user record shown in the detail/record view — same shape as the list row
// (`updatedAt` doubles as the optimistic-concurrency token on rank save).
export type User = UserListRow

// Editable slice of the user record: rank only. Activation is a discrete action
// (its own route), not a saved form field.
export type UserForm = {
  rank: UserRank
}

export function toUserForm(user: User): UserForm {
  return { rank: user.rank }
}

// Payload for changing a user's rank. The rank scope (who may set which rank) is
// enforced in the use case via `canInviteRank`, not here.
export const updateUserRankPayloadSchema = z.object({
  rank: z.enum(["DEVELOPER", "TIER_1", "TIER_2", "TIER_3"]),
})

export type UpdateUserRankPayload = z.infer<typeof updateUserRankPayloadSchema>

// Payload for activating/deactivating a user.
export const setUserActivePayloadSchema = z.object({
  isActive: z.boolean(),
})

export type SetUserActivePayload = z.infer<typeof setUserActivePayloadSchema>
