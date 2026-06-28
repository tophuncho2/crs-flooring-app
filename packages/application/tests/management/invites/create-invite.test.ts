import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createInviteRecordMock } = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  createInviteRecordMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
  createInviteRecord: createInviteRecordMock,
}))

import { createInviteUseCase } from "../../../src/management/invites/create-invite.js"

const DEV = { email: "otto@crsfloorcovering.com", rank: "DEVELOPER" } as const

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createInviteRecordMock.mockReset()
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createInviteRecordMock.mockResolvedValue({
    id: "inv-1",
    email: "newhire@crsfloorcovering.com",
    rank: "TIER_2",
    invitedBy: "otto@crsfloorcovering.com",
    expiresAt: "2026-07-05T00:00:00.000Z",
    acceptedAt: null,
    createdAt: "2026-06-28T00:00:00.000Z",
  })
})

describe("createInviteUseCase", () => {
  it("rejects a non-manager (403) and never inserts", async () => {
    await expect(
      createInviteUseCase({ email: "x@crsfloorcovering.com", rank: "TIER_3" }, {
        email: "joe@crsfloorcovering.com",
        rank: "TIER_3",
      }),
    ).rejects.toMatchObject({ code: "INVITE_NOT_AUTHORIZED", status: 403 })
    expect(createInviteRecordMock).not.toHaveBeenCalled()
  })

  it("forbids inviting above the actor's own rank (403) and never inserts", async () => {
    await expect(
      createInviteUseCase({ email: "x@crsfloorcovering.com", rank: "DEVELOPER" }, {
        email: "matt@crsfloorcovering.com",
        rank: "TIER_1",
      }),
    ).rejects.toMatchObject({ code: "INVITE_FORBIDDEN_RANK", status: 403, field: "rank" })
    expect(createInviteRecordMock).not.toHaveBeenCalled()
  })

  it("forbids inviting at the actor's OWN rank — strictly-below only (403)", async () => {
    await expect(
      createInviteUseCase({ email: "x@crsfloorcovering.com", rank: "TIER_1" }, {
        email: "matt@crsfloorcovering.com",
        rank: "TIER_1",
      }),
    ).rejects.toMatchObject({ code: "INVITE_FORBIDDEN_RANK", status: 403, field: "rank" })
    expect(createInviteRecordMock).not.toHaveBeenCalled()
  })

  it("persists a normalized email + rank + invitedBy + expiresAt, never a token", async () => {
    await createInviteUseCase({ email: "  NewHire@CRSFloorcovering.com  ", rank: "TIER_2" }, DEV)

    const arg = createInviteRecordMock.mock.calls[0][0]
    expect(arg).toMatchObject({
      email: "newhire@crsfloorcovering.com",
      rank: "TIER_2",
      invitedBy: "otto@crsfloorcovering.com",
    })
    expect(arg.expiresAt).toBeInstanceOf(Date)
    expect(arg).not.toHaveProperty("token")
  })

  it("returns the created invite summary without a token", async () => {
    const result = await createInviteUseCase({ email: "newhire@crsfloorcovering.com", rank: "TIER_2" }, DEV)
    expect(result).toEqual({
      id: "inv-1",
      email: "newhire@crsfloorcovering.com",
      rank: "TIER_2",
      expiresAt: "2026-07-05T00:00:00.000Z",
    })
    expect(result).not.toHaveProperty("token")
  })
})
