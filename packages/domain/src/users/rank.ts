// Canonical user-rank hierarchy. DEVELOPER sees/does everything; among the
// numbered tiers TIER_1 is the highest rank and TIER_3 the lowest.
//
// This is the FOUNDATION for visibility/edit gating: `canSee` defines the rule,
// but nothing enforces it yet. The later gating sweep wires this predicate into
// the request pipeline — until then it is pure, unenforced policy.
//
// Mirrors the Prisma-generated `UserRank` enum (in `@builders/db`) member-for-
// member; the two are structurally identical string unions, so values cross the
// data-layer boundary without conversion.
export type UserRank = "DEVELOPER" | "TIER_1" | "TIER_2" | "TIER_3"

export const USER_RANKS: readonly UserRank[] = [
  "DEVELOPER",
  "TIER_1",
  "TIER_2",
  "TIER_3",
]

// Lower number = higher privilege. DEVELOPER outranks every tier.
export const RANK_ORDER: Record<UserRank, number> = {
  DEVELOPER: 0,
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
}

/**
 * Whether `viewer` may see a resource scoped to `target`'s rank. DEVELOPER sees
 * everything; otherwise a viewer sees its own rank and everything ranked below
 * it. Pure predicate — the unenforced seam the future gating sweep hooks into.
 */
export function canSee(viewer: UserRank, target: UserRank): boolean {
  if (viewer === "DEVELOPER") return true
  return RANK_ORDER[viewer] <= RANK_ORDER[target]
}

/**
 * Whether `viewer` ranks at or above `minimum`. The threshold form of the gate
 * (vs. `canSee`, which compares two resource-scoped ranks): use this for page-
 * and route-level access where a single minimum rank guards a feature.
 */
export function hasRankAtLeast(viewer: UserRank, minimum: UserRank): boolean {
  return RANK_ORDER[viewer] <= RANK_ORDER[minimum]
}

// Minimum rank that may see and (later) manage the Users + Login Activity pages.
// DEVELOPER + TIER_1 qualify; TIER_2 and TIER_3 do not.
export const USER_MANAGEMENT_MIN_RANK: UserRank = "TIER_1"

/** Whether `rank` may access the user-management pages (Users, Login Activity). */
export function canManageUsers(rank: UserRank): boolean {
  return hasRankAtLeast(rank, USER_MANAGEMENT_MIN_RANK)
}

// Minimum rank for the Payments module. DEVELOPER + TIER_1 + TIER_2 qualify;
// TIER_3 does not. Mirrors USER_MANAGEMENT_MIN_RANK's shape — the threshold
// consumed by the generic page/route/nav rank guards.
export const RESTRICTED_MODULE_MIN_RANK: UserRank = "TIER_2"

// Minimum rank for modules limited to TIER_1 and above (Warehouse, Certificate
// Tracking, Job Types). DEVELOPER + TIER_1 qualify; TIER_2 and TIER_3 do not. A
// distinct, module-scoped floor (not USER_MANAGEMENT_MIN_RANK) so tightening one
// group never moves the other, even though both currently sit at TIER_1.
export const ELEVATED_MODULE_MIN_RANK: UserRank = "TIER_1"
