import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  deleteEntityRecordByIdMock,
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
    deleteEntityRecordByIdMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  deleteEntityRecordById: deleteEntityRecordByIdMock,
}))

import { deleteEntityUseCase } from "../../../src/management/entities/delete-entity.js"

const ID = "entity-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  deleteEntityRecordByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  deleteEntityRecordByIdMock.mockResolvedValue(undefined)
})

describe("deleteEntityUseCase", () => {
  it("deletes and returns ok regardless of linked properties", async () => {
    expect(await deleteEntityUseCase(ID)).toEqual({ ok: true })
    expect(deleteEntityRecordByIdMock).toHaveBeenCalledWith(ID, expect.anything())
  })

  it("maps a P2025 to a 404 not-found", async () => {
    deleteEntityRecordByIdMock.mockRejectedValue(
      new PrismaKnownError("missing", { code: "P2025" }),
    )
    await expect(deleteEntityUseCase(ID)).rejects.toMatchObject({
      code: "ENTITY_NOT_FOUND",
      status: 404,
    })
  })
})
