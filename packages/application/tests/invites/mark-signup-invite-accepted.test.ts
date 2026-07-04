import { beforeEach, describe, expect, it, vi } from "vitest"

const { markInviteAcceptedByEmailMock } = vi.hoisted(() => ({
  markInviteAcceptedByEmailMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  markInviteAcceptedByEmail: markInviteAcceptedByEmailMock,
}))

import { markSignupInviteAccepted } from "../../src/invites/mark-signup-invite-accepted.js"

beforeEach(() => {
  markInviteAcceptedByEmailMock.mockReset()
  markInviteAcceptedByEmailMock.mockResolvedValue(undefined)
})

describe("markSignupInviteAccepted", () => {
  it("retires the invite by stamping accepted for the normalized email (the user.create.after path)", async () => {
    await markSignupInviteAccepted("  NewHire@CRSFloorcovering.com  ")

    expect(markInviteAcceptedByEmailMock).toHaveBeenCalledTimes(1)
    const [email, acceptedAt] = markInviteAcceptedByEmailMock.mock.calls[0]
    expect(email).toBe("newhire@crsfloorcovering.com")
    expect(acceptedAt).toBeInstanceOf(Date)
  })
})
