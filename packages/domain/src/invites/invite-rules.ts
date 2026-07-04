import { canManageUsers, RANK_ORDER, type UserRank } from "../users/rank.js"
import { createInvitePayloadSchema, type InviteCreateForm } from "./types.js"

// Client-side gate for the invite create form — email required + well-formed,
// reusing the same zod schema the API route validates against so the two agree.
export function validateInviteCreateForm(input: InviteCreateForm): string {
  const email = input.email.trim()
  if (!email) return "Email is required"
  const parsed = createInvitePayloadSchema.safeParse({ email, rank: input.rank })
  if (!parsed.success) return "Enter a valid email address"
  return ""
}

// Who may manage whom — the single rank-scope predicate behind invites,
// rank-change, AND deactivation. The actor must be allowed to manage users at all
// (DEVELOPER + TIER_1), and may only act on ranks STRICTLY BELOW their own — so a
// TIER_1 cannot touch another TIER_1, and no one can create or edit a DEVELOPER
// through the app (DEVELOPER is set only via the break-glass seed/script). Lower
// RANK_ORDER = higher privilege, so "strictly below" means the target's order is
// greater than the actor's.
export function canInviteRank(inviter: UserRank, target: UserRank): boolean {
  if (!canManageUsers(inviter)) {
    return false
  }
  return RANK_ORDER[target] > RANK_ORDER[inviter]
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
