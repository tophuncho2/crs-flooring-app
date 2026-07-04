import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getUserRecordByIdMock,
  deleteUserRecordByIdMock,
  PrismaKnownError,
} = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string
    constructor(message: string, opts: { code: string }) {
      super(message)
      this.code = opts.code
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    getUserRecordByIdMock: vi.fn(),
    deleteUserRecordByIdMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getUserRecordById: getUserRecordByIdMock,
  deleteUserRecordById: deleteUserRecordByIdMock,
}))

import { deleteUserUseCase } from "../../src/users/delete-user.js"

const DEV = { id: "otto", email: "otto@crsfloorcovering.com", rank: "DEVELOPER" } as const
const TARGET = {
  id: "u-1",
  email: "joe@crsfloorcovering.com",
  rank: "TIER_2",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-28T00:00:00.000Z",
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getUserRecordByIdMock.mockReset()
  deleteUserRecordByIdMock.mockReset()
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getUserRecordByIdMock.mockResolvedValue(TARGET)
  deleteUserRecordByIdMock.mockResolvedValue(undefined)
})

describe("deleteUserUseCase", () => {
  it("rejects a non-manager (403) and never loads or writes", async () => {
    await expect(
      deleteUserUseCase({ id: "u-1", expectedUpdatedAt: TARGET.updatedAt }, {
        id: "joe",
        email: "joe@crsfloorcovering.com",
        rank: "TIER_3",
      }),
    ).rejects.toMatchObject({ code: "USER_NOT_AUTHORIZED", status: 403 })
    expect(getUserRecordByIdMock).not.toHaveBeenCalled()
    expect(deleteUserRecordByIdMock).not.toHaveBeenCalled()
  })

  it("blocks deleting your own account (400), before any load/write", async () => {
    await expect(
      deleteUserUseCase({ id: "otto", expectedUpdatedAt: TARGET.updatedAt }, DEV),
    ).rejects.toMatchObject({ code: "USER_SELF_DELETE", status: 400 })
    expect(getUserRecordByIdMock).not.toHaveBeenCalled()
    expect(deleteUserRecordByIdMock).not.toHaveBeenCalled()
  })

  it("404s when the target user does not exist", async () => {
    getUserRecordByIdMock.mockResolvedValue(null)
    await expect(
      deleteUserUseCase({ id: "missing", expectedUpdatedAt: "x" }, DEV),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND", status: 404 })
    expect(deleteUserRecordByIdMock).not.toHaveBeenCalled()
  })

  it("forbids deleting a user ranked above the actor (403)", async () => {
    getUserRecordByIdMock.mockResolvedValue({ ...TARGET, rank: "DEVELOPER" })
    await expect(
      deleteUserUseCase({ id: "u-1", expectedUpdatedAt: TARGET.updatedAt }, {
        id: "matt",
        email: "matt@crsfloorcovering.com",
        rank: "TIER_1",
      }),
    ).rejects.toMatchObject({ code: "USER_FORBIDDEN_RANK", status: 403 })
    expect(deleteUserRecordByIdMock).not.toHaveBeenCalled()
  })

  it("forbids deleting a SAME-rank peer — strictly-below only (403)", async () => {
    getUserRecordByIdMock.mockResolvedValue({ ...TARGET, rank: "TIER_1" })
    await expect(
      deleteUserUseCase({ id: "u-1", expectedUpdatedAt: TARGET.updatedAt }, {
        id: "matt",
        email: "matt@crsfloorcovering.com",
        rank: "TIER_1",
      }),
    ).rejects.toMatchObject({ code: "USER_FORBIDDEN_RANK", status: 403 })
    expect(deleteUserRecordByIdMock).not.toHaveBeenCalled()
  })

  it("409s on an optimistic-concurrency mismatch, with a snapshot, and never writes", async () => {
    await expect(
      deleteUserUseCase({ id: "u-1", expectedUpdatedAt: "STALE" }, DEV),
    ).rejects.toMatchObject({
      code: "USER_CONFLICT",
      status: 409,
      field: "updatedAt",
      payload: { snapshot: { user: TARGET } },
    })
    expect(deleteUserRecordByIdMock).not.toHaveBeenCalled()
  })

  it("deletes the target and returns ok on success", async () => {
    const result = await deleteUserUseCase({ id: "u-1", expectedUpdatedAt: TARGET.updatedAt }, DEV)
    expect(deleteUserRecordByIdMock).toHaveBeenCalledWith("u-1", expect.anything())
    expect(result).toEqual({ ok: true })
  })

  it("maps a P2025 on delete to a 404 not-found", async () => {
    deleteUserRecordByIdMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(
      deleteUserUseCase({ id: "u-1", expectedUpdatedAt: TARGET.updatedAt }, DEV),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND", status: 404 })
  })
})
