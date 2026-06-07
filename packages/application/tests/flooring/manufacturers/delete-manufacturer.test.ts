import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, deleteManufacturerRecordByIdMock, PrismaKnownError } =
  vi.hoisted(() => {
    class PrismaKnownError extends Error {
      code: string
      constructor(message: string, opts: { code: string }) {
        super(message)
        this.code = opts.code
      }
    }
    return {
      withDatabaseTransactionMock: vi.fn(),
      deleteManufacturerRecordByIdMock: vi.fn(),
      PrismaKnownError,
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  deleteManufacturerRecordById: deleteManufacturerRecordByIdMock,
}))

import { deleteManufacturerUseCase } from "../../../src/flooring/manufacturers/delete-manufacturer.js"

const ID = "mfr-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  deleteManufacturerRecordByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  deleteManufacturerRecordByIdMock.mockResolvedValue(undefined)
})

describe("deleteManufacturerUseCase", () => {
  it("deletes and returns ok", async () => {
    expect(await deleteManufacturerUseCase(ID)).toEqual({ ok: true })
    expect(deleteManufacturerRecordByIdMock).toHaveBeenCalledWith(ID, expect.anything())
  })

  it("maps a P2025 on delete to a 404 not-found", async () => {
    deleteManufacturerRecordByIdMock.mockRejectedValue(
      new PrismaKnownError("missing", { code: "P2025" }),
    )
    await expect(deleteManufacturerUseCase(ID)).rejects.toMatchObject({
      code: "MANUFACTURER_NOT_FOUND",
      status: 404,
    })
  })
})
