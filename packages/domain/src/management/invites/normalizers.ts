import type { UserRank } from "../users/rank.js"
import type { UserInvite } from "./types.js"

type UserInviteInput = {
  id: string
  email: string
  rank: UserRank | string
  token: string
  invitedBy: string | null
  expiresAt: Date | string
  acceptedAt: Date | string | null
  createdAt: Date | string
}

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value)

export function normalizeUserInvite(invite: UserInviteInput): UserInvite {
  return {
    id: invite.id,
    email: invite.email,
    rank: invite.rank as UserRank,
    token: invite.token,
    invitedBy: invite.invitedBy,
    expiresAt: toIso(invite.expiresAt),
    acceptedAt: invite.acceptedAt ? toIso(invite.acceptedAt) : null,
    createdAt: toIso(invite.createdAt),
  }
}
