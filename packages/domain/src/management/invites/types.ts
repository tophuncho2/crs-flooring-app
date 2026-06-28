import { z } from "zod"
import type { UserRank } from "../users/rank.js"

// Invite-only, rank-scoped provisioning. An invite encodes the email + the rank
// the new user will receive; Google verifies the identity at sign-in. The token
// is the shareable link identifier (the manager copy-pastes the link).
export type UserInvite = {
  id: string
  email: string
  rank: UserRank
  token: string
  invitedBy: string | null
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

// How long an invite link stays valid (7 days).
export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// User-supplied payload for creating an invite. The rank scope (who may invite
// whom) is enforced in `invite-rules`, not here.
export const createInvitePayloadSchema = z.object({
  email: z.string().trim().email(),
  rank: z.enum(["DEVELOPER", "TIER_1", "TIER_2", "TIER_3"]),
})

export type CreateInvitePayload = z.infer<typeof createInvitePayloadSchema>
