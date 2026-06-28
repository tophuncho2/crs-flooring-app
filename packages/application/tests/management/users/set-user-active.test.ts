import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, getUserRecordByIdMock, setUserActiveMock, deleteUserSessionsMock } =
  vi.hoisted(() => ({
    withDatabaseTransactionMock: vi.fn(),
    getUserRecordByIdMock: vi.fn(),
    setUserActiveMock: vi.fn(),
    deleteUserSessionsMock: vi.fn(),
  }))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
  getUserRecordById: getUserRecordByIdMock,
  setUserActive: setUserActiveMock,
  deleteUserSessions: deleteUserSessionsMock,
}))

import { setUserActiveUseCase } from "../../../src/management/users/set-user-active.js"

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
  setUserActiveMock.mockReset()
  deleteUserSessionsMock.mockReset()
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getUserRecordByIdMock.mockResolvedValue(TARGET)
  setUserActiveMock.mockImplementation(async (_id: string, isActive: boolean) => ({ ...TARGET, isActive }))
  deleteUserSessionsMock.mockResolvedValue(undefined)
})

describe("setUserActiveUseCase", () => {
  it("rejects a non-manager (403) and never writes", async () => {
    await expect(
      setUserActiveUseCase({ id: "u-1", isActive: false }, {
        id: "joe",
        email: "joe@crsfloorcovering.com",
        rank: "TIER_3",
      }),
    ).rejects.toMatchObject({ code: "USER_NOT_AUTHORIZED", status: 403 })
    expect(setUserActiveMock).not.toHaveBeenCalled()
  })

  it("blocks deactivating your own account (400), before any load/write", async () => {
    await expect(
      setUserActiveUseCase({ id: "otto", isActive: false }, DEV),
    ).rejects.toMatchObject({ code: "USER_SELF_DEACTIVATE", status: 400 })
    expect(getUserRecordByIdMock).not.toHaveBeenCalled()
    expect(setUserActiveMock).not.toHaveBeenCalled()
  })

  it("forbids editing a user ranked above the actor (403)", async () => {
    getUserRecordByIdMock.mockResolvedValue({ ...TARGET, rank: "DEVELOPER" })
    await expect(
      setUserActiveUseCase({ id: "u-1", isActive: false }, {
        id: "matt",
        email: "matt@crsfloorcovering.com",
        rank: "TIER_1",
      }),
    ).rejects.toMatchObject({ code: "USER_FORBIDDEN_RANK", status: 403 })
    expect(setUserActiveMock).not.toHaveBeenCalled()
  })

  it("deactivates AND revokes the target's sessions", async () => {
    const result = await setUserActiveUseCase({ id: "u-1", isActive: false }, DEV)
    expect(setUserActiveMock).toHaveBeenCalledWith("u-1", false, expect.anything())
    expect(deleteUserSessionsMock).toHaveBeenCalledWith("u-1", expect.anything())
    expect(result).toMatchObject({ id: "u-1", isActive: false })
  })

  it("reactivates WITHOUT revoking sessions", async () => {
    getUserRecordByIdMock.mockResolvedValue({ ...TARGET, isActive: false })
    const result = await setUserActiveUseCase({ id: "u-1", isActive: true }, DEV)
    expect(setUserActiveMock).toHaveBeenCalledWith("u-1", true, expect.anything())
    expect(deleteUserSessionsMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({ id: "u-1", isActive: true })
  })
})
