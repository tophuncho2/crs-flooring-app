import { toIsoTimestamp } from "../shared/date-format.js"
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

export function normalizeUserInvite(invite: UserInviteInput): UserInvite {
  return {
    id: invite.id,
    email: invite.email,
    rank: invite.rank as UserRank,
    invitedBy: invite.invitedBy,
    expiresAt: toIsoTimestamp(invite.expiresAt),
    acceptedAt: invite.acceptedAt ? toIsoTimestamp(invite.acceptedAt) : null,
    createdAt: toIsoTimestamp(invite.createdAt),
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
    expiresAt: toIsoTimestamp(invite.expiresAt),
    createdAt: toIsoTimestamp(invite.createdAt),
  }
}
