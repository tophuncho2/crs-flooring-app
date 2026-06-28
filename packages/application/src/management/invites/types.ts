import type { UserRank } from "@builders/domain"

export type CreateInviteUseCaseInput = {
  email: string
  rank: UserRank
}

// The inviting user, server-derived from the session — never client input.
export type InviteActor = {
  email: string
  rank: UserRank
}

export type CreateInviteResult = {
  id: string
  email: string
  rank: UserRank
  token: string
  expiresAt: string
}
