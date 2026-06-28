import type { UserRank } from "../users/rank.js"
import type { InviteListRow, UserInvite } from "./types.js"

type UserInviteInput = {
  id: string
  email: string
  rank: UserRank | string
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
    invitedBy: invite.invitedBy,
    expiresAt: toIso(invite.expiresAt),
    acceptedAt: invite.acceptedAt ? toIso(invite.acceptedAt) : null,
    createdAt: toIso(invite.createdAt),
  }
}

type InviteListRowInput = {
  id: string
  email: string
  rank: UserRank | string
  invitedBy: string | null
  expiresAt: Date | string
  createdAt: Date | string
}

export function normalizeInviteListRow(invite: InviteListRowInput): InviteListRow {
  return {
    id: invite.id,
    email: invite.email,
    rank: invite.rank as UserRank,
    invitedBy: invite.invitedBy,
    expiresAt: toIso(invite.expiresAt),
    createdAt: toIso(invite.createdAt),
  }
}
