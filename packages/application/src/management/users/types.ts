import type { UserRank } from "@builders/domain"

// The acting user, server-derived from the session — never client input. `id` is
// needed so we can block self-deactivation.
export type UserActor = {
  id: string
  email: string
  rank: UserRank
}
