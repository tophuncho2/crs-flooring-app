import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, deleteInviteByIdMock } = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  deleteInviteByIdMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
  deleteInviteById: deleteInviteByIdMock,
}))

import { revokeInviteUseCase } from "../../../src/management/invites/revoke-invite.js"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  deleteInviteByIdMock.mockReset()
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  deleteInviteByIdMock.mockResolvedValue(undefined)
})

describe("revokeInviteUseCase", () => {
  it("rejects a non-manager (403) and never deletes", async () => {
    await expect(
      revokeInviteUseCase("inv-1", { email: "joe@crsfloorcovering.com", rank: "TIER_3" }),
    ).rejects.toMatchObject({ code: "INVITE_NOT_AUTHORIZED", status: 403 })
    expect(deleteInviteByIdMock).not.toHaveBeenCalled()
  })

  it("deletes the invite by id for a manager", async () => {
    await revokeInviteUseCase("inv-1", { email: "otto@crsfloorcovering.com", rank: "DEVELOPER" })
    expect(deleteInviteByIdMock).toHaveBeenCalledWith("inv-1", expect.anything())
  })
})
