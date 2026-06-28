import { canManageUsers, RANK_ORDER, type UserRank } from "../users/rank.js"

// Who may invite whom. The inviter must be allowed to manage users at all
// (DEVELOPER + TIER_1), and may only invite at or below their own authority — so
// a TIER_1 can never mint a DEVELOPER. Lower RANK_ORDER = higher privilege, so
// "at or below" means the target's order is >= the inviter's.
export function canInviteRank(inviter: UserRank, target: UserRank): boolean {
  if (!canManageUsers(inviter)) {
    return false
  }
  return RANK_ORDER[target] >= RANK_ORDER[inviter]
}

// An invite is "open" (redeemable) when it is neither accepted nor expired.
// `now` is injected so the predicate stays pure.
export function isInviteOpen(
  invite: { acceptedAt: string | null; expiresAt: string },
  now: Date,
): boolean {
  if (invite.acceptedAt) {
    return false
  }
  return new Date(invite.expiresAt).getTime() > now.getTime()
}
