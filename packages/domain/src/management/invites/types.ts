import { z } from "zod"
import type { UserRank } from "../users/rank.js"

// Invite-only, rank-scoped provisioning. An invite encodes the email + the rank
// the new user will receive; Google verifies the identity at sign-in. There is
// no secret link — the "invite" is just a per-email row matched at the signup
// gate, so the invitee simply signs in with Google.
export type UserInvite = {
  id: string
  email: string
  rank: UserRank
  invitedBy: string | null
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

// Row shape for the pending-invites list view.
export type InviteListRow = {
  id: string
  email: string
  rank: UserRank
  invitedBy: string | null
  expiresAt: string
  createdAt: string
}

// Cross-layer config for the pending-invites list view (referenced by the use
// case / route validator and the client data wrapper).
export const LIST_INVITES_PAGE_SIZE = 50
export const LIST_INVITES_MAX_PAGE_SIZE = 200

// How long an invite stays valid (7 days).
export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// User-supplied payload for creating an invite. The rank scope (who may invite
// whom) is enforced in `invite-rules`, not here.
export const createInvitePayloadSchema = z.object({
  email: z.string().trim().email(),
  rank: z.enum(["DEVELOPER", "TIER_1", "TIER_2", "TIER_3"]),
})

export type CreateInvitePayload = z.infer<typeof createInvitePayloadSchema>
