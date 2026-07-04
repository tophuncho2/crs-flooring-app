import { describe, expect, it } from "vitest"
import { canInviteRank, isInviteOpen } from "../../src/invites/invite-rules.js"

describe("canInviteRank", () => {
  it("lets DEVELOPER act on every lower rank, but NOT another DEVELOPER", () => {
    expect(canInviteRank("DEVELOPER", "TIER_1")).toBe(true)
    expect(canInviteRank("DEVELOPER", "TIER_3")).toBe(true)
    // Strictly below — DEVELOPER cannot create/edit another DEVELOPER (script-only).
    expect(canInviteRank("DEVELOPER", "DEVELOPER")).toBe(false)
  })

  it("lets TIER_1 act only on ranks STRICTLY below its own", () => {
    expect(canInviteRank("TIER_1", "TIER_2")).toBe(true)
    expect(canInviteRank("TIER_1", "TIER_3")).toBe(true)
    // No same-rank actions: a TIER_1 cannot touch another TIER_1.
    expect(canInviteRank("TIER_1", "TIER_1")).toBe(false)
    expect(canInviteRank("TIER_1", "DEVELOPER")).toBe(false)
  })

  it("forbids ranks that cannot manage users from acting at all", () => {
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
