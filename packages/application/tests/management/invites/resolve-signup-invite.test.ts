import { beforeEach, describe, expect, it, vi } from "vitest"

const { findOpenInviteByEmailMock } = vi.hoisted(() => ({
  findOpenInviteByEmailMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  findOpenInviteByEmail: findOpenInviteByEmailMock,
}))

import { resolveSignupInviteRank } from "../../../src/management/invites/resolve-signup-invite.js"

beforeEach(() => {
  findOpenInviteByEmailMock.mockReset()
})

describe("resolveSignupInviteRank", () => {
  it("returns the invited rank when an open invite matches the (normalized) email", async () => {
    findOpenInviteByEmailMock.mockResolvedValue({ id: "inv-1", rank: "TIER_2" })

    const rank = await resolveSignupInviteRank("  NewHire@CRSFloorcovering.com  ")

    expect(rank).toBe("TIER_2")
    expect(findOpenInviteByEmailMock).toHaveBeenCalledWith("newhire@crsfloorcovering.com", expect.any(Date))
  })

  it("returns null when there is no open invite (signup gate fails closed)", async () => {
    findOpenInviteByEmailMock.mockResolvedValue(null)
    expect(await resolveSignupInviteRank("stranger@crsfloorcovering.com")).toBeNull()
  })
})
