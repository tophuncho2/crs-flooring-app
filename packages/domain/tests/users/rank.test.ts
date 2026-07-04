import { describe, expect, it } from "vitest"
import {
  canManageUsers,
  hasRankAtLeast,
  USER_MANAGEMENT_MIN_RANK,
} from "../../src/users/rank.js"

describe("hasRankAtLeast", () => {
  it("treats DEVELOPER as outranking every tier", () => {
    expect(hasRankAtLeast("DEVELOPER", "TIER_3")).toBe(true)
    expect(hasRankAtLeast("DEVELOPER", "TIER_1")).toBe(true)
  })

  it("is true when the viewer meets or beats the minimum", () => {
    expect(hasRankAtLeast("TIER_1", "TIER_1")).toBe(true)
    expect(hasRankAtLeast("TIER_1", "TIER_2")).toBe(true)
  })

  it("is false when the viewer ranks below the minimum", () => {
    expect(hasRankAtLeast("TIER_2", "TIER_1")).toBe(false)
    expect(hasRankAtLeast("TIER_3", "TIER_1")).toBe(false)
  })
})

describe("canManageUsers", () => {
  it("admits DEVELOPER and TIER_1", () => {
    expect(canManageUsers("DEVELOPER")).toBe(true)
    expect(canManageUsers("TIER_1")).toBe(true)
  })

  it("rejects TIER_2 and TIER_3", () => {
    expect(canManageUsers("TIER_2")).toBe(false)
    expect(canManageUsers("TIER_3")).toBe(false)
  })

  it("gates on the management threshold constant", () => {
    expect(USER_MANAGEMENT_MIN_RANK).toBe("TIER_1")
  })
})
