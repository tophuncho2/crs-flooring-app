import { describe, expect, it } from "vitest"
import { canInviteRank, isInviteOpen } from "../../../src/management/invites/invite-rules.js"

describe("canInviteRank", () => {
  it("lets DEVELOPER invite any rank", () => {
    expect(canInviteRank("DEVELOPER", "DEVELOPER")).toBe(true)
    expect(canInviteRank("DEVELOPER", "TIER_1")).toBe(true)
    expect(canInviteRank("DEVELOPER", "TIER_3")).toBe(true)
  })

  it("lets TIER_1 invite at or below its own rank, but never DEVELOPER", () => {
    expect(canInviteRank("TIER_1", "TIER_1")).toBe(true)
    expect(canInviteRank("TIER_1", "TIER_2")).toBe(true)
    expect(canInviteRank("TIER_1", "DEVELOPER")).toBe(false)
  })

  it("forbids ranks that cannot manage users from inviting at all", () => {
    expect(canInviteRank("TIER_2", "TIER_3")).toBe(false)
    expect(canInviteRank("TIER_3", "TIER_3")).toBe(false)
  })
})

describe("isInviteOpen", () => {
  const now = new Date("2026-06-28T00:00:00.000Z")

  it("is open when neither accepted nor expired", () => {
    expect(isInviteOpen({ acceptedAt: null, expiresAt: "2026-07-05T00:00:00.000Z" }, now)).toBe(true)
  })

  it("is closed once accepted", () => {
    expect(
      isInviteOpen({ acceptedAt: "2026-06-28T00:00:00.000Z", expiresAt: "2026-07-05T00:00:00.000Z" }, now),
    ).toBe(false)
  })

  it("is closed once expired", () => {
    expect(isInviteOpen({ acceptedAt: null, expiresAt: "2026-06-27T00:00:00.000Z" }, now)).toBe(false)
  })
})
