import { RANK_ORDER, USER_RANKS, type UserRank } from "@builders/domain"

export const RANK_LABELS: Record<UserRank, string> = {
  DEVELOPER: "Developer",
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
}

// Ranks the actor may grant — at or below their own (mirrors domain canInviteRank).
export function assignableRanks(actorRank: UserRank): UserRank[] {
  return USER_RANKS.filter((rank) => RANK_ORDER[rank] >= RANK_ORDER[actorRank])
}

// Whether the actor may edit a user currently at `targetRank` (not someone above).
export function canEditRank(actorRank: UserRank, targetRank: UserRank): boolean {
  return RANK_ORDER[targetRank] >= RANK_ORDER[actorRank]
}
