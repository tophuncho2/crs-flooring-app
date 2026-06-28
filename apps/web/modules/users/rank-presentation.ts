import { RANK_ORDER, USER_RANKS, type UserRank } from "@builders/domain"

export const RANK_LABELS: Record<UserRank, string> = {
  DEVELOPER: "Developer",
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
}

// Ranks the actor may grant — strictly below their own (mirrors domain
// canInviteRank). Excludes the actor's own rank and everything above it, so a
// TIER_1 sees only TIER_2/TIER_3 and DEVELOPER is never assignable via the app.
export function assignableRanks(actorRank: UserRank): UserRank[] {
  return USER_RANKS.filter((rank) => RANK_ORDER[rank] > RANK_ORDER[actorRank])
}

// Whether the actor may edit a user at `targetRank` — only ranks strictly below
// their own (never a peer at the same rank, never anyone above; DEVELOPER rows
// lock for everyone).
export function canEditRank(actorRank: UserRank, targetRank: UserRank): boolean {
  return RANK_ORDER[targetRank] > RANK_ORDER[actorRank]
}
