import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, deleteJobTypeRecordByIdMock, PrismaKnownError } = vi.hoisted(
  () => {
    class PrismaKnownError extends Error {
      code: string
      constructor(message: string, opts: { code: string }) {
        super(message)
        this.code = opts.code
      }
    }
    return {
      withDatabaseTransactionMock: vi.fn(),
      deleteJobTypeRecordByIdMock: vi.fn(),
      PrismaKnownError,
    }
  },
)

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  deleteJobTypeRecordById: deleteJobTypeRecordByIdMock,
}))

import { deleteJobTypeUseCase } from "../../src/job-types/delete-job-type.js"

const ID = "jt-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  deleteJobTypeRecordByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  deleteJobTypeRecordByIdMock.mockResolvedValue(undefined)
})

describe("deleteJobTypeUseCase", () => {
  it("deletes and returns ok", async () => {
    expect(await deleteJobTypeUseCase(ID)).toEqual({ ok: true })
    expect(deleteJobTypeRecordByIdMock).toHaveBeenCalledWith(ID, expect.anything())
  })

  it("maps a P2025 on delete to a 404 not-found", async () => {
    deleteJobTypeRecordByIdMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(deleteJobTypeUseCase(ID)).rejects.toMatchObject({
      code: "JOB_TYPE_NOT_FOUND",
      status: 404,
    })
  })
})
