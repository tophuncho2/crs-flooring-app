import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  countTemplatesByPropertyIdMock,
  deletePropertyRecordByIdMock,
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
    countTemplatesByPropertyIdMock: vi.fn(),
    deletePropertyRecordByIdMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  countTemplatesByPropertyId: countTemplatesByPropertyIdMock,
  deletePropertyRecordById: deletePropertyRecordByIdMock,
}))

import { deletePropertyUseCase } from "../../src/properties/delete-property.js"

const ID = "prop-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  countTemplatesByPropertyIdMock.mockReset()
  deletePropertyRecordByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  countTemplatesByPropertyIdMock.mockResolvedValue(0)
  deletePropertyRecordByIdMock.mockResolvedValue(undefined)
})

describe("deletePropertyUseCase", () => {
  it("blocks deletion with 409 when templates are linked and never deletes", async () => {
    countTemplatesByPropertyIdMock.mockResolvedValue(2)
    await expect(deletePropertyUseCase(ID)).rejects.toMatchObject({
      code: "PROPERTY_IN_USE",
      status: 409,
    })
    expect(deletePropertyRecordByIdMock).not.toHaveBeenCalled()
  })

  it("deletes and returns ok when there are no linked templates", async () => {
    const result = await deletePropertyUseCase(ID)
    expect(result).toEqual({ ok: true })
    expect(deletePropertyRecordByIdMock).toHaveBeenCalledWith(ID, expect.anything())
  })

  it("maps a P2025 to a 404 not-found", async () => {
    deletePropertyRecordByIdMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(deletePropertyUseCase(ID)).rejects.toMatchObject({
      code: "PROPERTY_NOT_FOUND",
      status: 404,
    })
  })
})
