import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, getUserRecordByIdMock, setUserRankMock, deleteUserSessionsMock } =
  vi.hoisted(() => ({
    withDatabaseTransactionMock: vi.fn(),
    getUserRecordByIdMock: vi.fn(),
    setUserRankMock: vi.fn(),
    deleteUserSessionsMock: vi.fn(),
  }))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
  getUserRecordById: getUserRecordByIdMock,
  setUserRank: setUserRankMock,
  deleteUserSessions: deleteUserSessionsMock,
}))

import { updateUserRankUseCase } from "../../../src/management/users/update-user-rank.js"

const DEV = { id: "otto", email: "otto@crsfloorcovering.com", rank: "DEVELOPER" } as const
const TARGET = {
  id: "u-1",
  email: "joe@crsfloorcovering.com",
  rank: "TIER_2",
  isActive: true,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-28T00:00:00.000Z",
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getUserRecordByIdMock.mockReset()
  setUserRankMock.mockReset()
  deleteUserSessionsMock.mockReset()
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getUserRecordByIdMock.mockResolvedValue(TARGET)
  setUserRankMock.mockResolvedValue({ ...TARGET, rank: "TIER_1", updatedAt: "2026-06-28T01:00:00.000Z" })
  deleteUserSessionsMock.mockResolvedValue(undefined)
})

describe("updateUserRankUseCase", () => {
  it("rejects a non-manager (403), never loads or writes", async () => {
    await expect(
      updateUserRankUseCase({ id: "u-1", rank: "TIER_2", expectedUpdatedAt: TARGET.updatedAt }, {
        id: "joe",
        email: "joe@crsfloorcovering.com",
        rank: "TIER_3",
      }),
    ).rejects.toMatchObject({ code: "USER_NOT_AUTHORIZED", status: 403 })
    expect(getUserRecordByIdMock).not.toHaveBeenCalled()
    expect(setUserRankMock).not.toHaveBeenCalled()
  })

  it("404s when the target user does not exist", async () => {
    getUserRecordByIdMock.mockResolvedValue(null)
    await expect(
      updateUserRankUseCase({ id: "missing", rank: "TIER_2", expectedUpdatedAt: "x" }, DEV),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND", status: 404 })
  })

  it("forbids editing a user ranked above the actor (403)", async () => {
    getUserRecordByIdMock.mockResolvedValue({ ...TARGET, rank: "DEVELOPER" })
    await expect(
      updateUserRankUseCase({ id: "u-1", rank: "TIER_2", expectedUpdatedAt: TARGET.updatedAt }, {
        id: "matt",
        email: "matt@crsfloorcovering.com",
        rank: "TIER_1",
      }),
    ).rejects.toMatchObject({ code: "USER_FORBIDDEN_RANK", status: 403, field: "rank" })
    expect(setUserRankMock).not.toHaveBeenCalled()
  })

  it("forbids granting a rank above the actor's own (403)", async () => {
    await expect(
      updateUserRankUseCase({ id: "u-1", rank: "DEVELOPER", expectedUpdatedAt: TARGET.updatedAt }, {
        id: "matt",
        email: "matt@crsfloorcovering.com",
        rank: "TIER_1",
      }),
    ).rejects.toMatchObject({ code: "USER_FORBIDDEN_RANK", status: 403 })
    expect(setUserRankMock).not.toHaveBeenCalled()
  })

  it("409s on an optimistic-concurrency mismatch, with a snapshot, and never writes", async () => {
    await expect(
      updateUserRankUseCase({ id: "u-1", rank: "TIER_1", expectedUpdatedAt: "STALE" }, DEV),
    ).rejects.toMatchObject({
      code: "USER_CONFLICT",
      status: 409,
      field: "updatedAt",
      payload: { snapshot: { user: TARGET } },
    })
    expect(setUserRankMock).not.toHaveBeenCalled()
    expect(deleteUserSessionsMock).not.toHaveBeenCalled()
  })

  it("changes the rank AND revokes the target's sessions on success", async () => {
    const result = await updateUserRankUseCase(
      { id: "u-1", rank: "TIER_1", expectedUpdatedAt: TARGET.updatedAt },
      DEV,
    )
    expect(setUserRankMock).toHaveBeenCalledWith("u-1", "TIER_1", expect.anything())
    expect(deleteUserSessionsMock).toHaveBeenCalledWith("u-1", expect.anything())
    expect(result).toMatchObject({ id: "u-1", rank: "TIER_1" })
  })
})
