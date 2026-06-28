import { describe, expect, it } from "vitest"
import { assignableRanks, canEditRank } from "@/modules/users/rank-presentation"

// These UI helpers are the client-side mirror of the domain `canInviteRank` rule:
// a manager may only act on ranks STRICTLY below their own.
describe("assignableRanks", () => {
  it("offers a DEVELOPER every lower rank but never DEVELOPER itself (script-only)", () => {
    expect(assignableRanks("DEVELOPER")).toEqual(["TIER_1", "TIER_2", "TIER_3"])
  })

  it("offers a TIER_1 only the ranks strictly below it (no TIER_1, no DEVELOPER)", () => {
    expect(assignableRanks("TIER_1")).toEqual(["TIER_2", "TIER_3"])
  })

  it("offers a TIER_2 only TIER_3", () => {
    expect(assignableRanks("TIER_2")).toEqual(["TIER_3"])
  })

  it("offers a TIER_3 nothing", () => {
    expect(assignableRanks("TIER_3")).toEqual([])
  })
})

describe("canEditRank", () => {
  it("lets an actor edit only ranks strictly below their own", () => {
    expect(canEditRank("TIER_1", "TIER_2")).toBe(true)
    expect(canEditRank("DEVELOPER", "TIER_1")).toBe(true)
  })

  it("forbids editing a same-rank peer", () => {
    expect(canEditRank("TIER_1", "TIER_1")).toBe(false)
    expect(canEditRank("DEVELOPER", "DEVELOPER")).toBe(false)
  })

  it("forbids editing anyone above the actor, and locks DEVELOPER rows for everyone", () => {
    expect(canEditRank("TIER_2", "TIER_1")).toBe(false)
    expect(canEditRank("TIER_1", "DEVELOPER")).toBe(false)
  })
})
