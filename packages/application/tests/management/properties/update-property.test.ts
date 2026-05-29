import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updatePropertyRecordMock, PrismaKnownError } = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string
    meta?: { target?: string[] }
    constructor(message: string, opts: { code: string; meta?: { target?: string[] } }) {
      super(message)
      this.code = opts.code
      this.meta = opts.meta
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    updatePropertyRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updatePropertyRecord: updatePropertyRecordMock,
}))

import { updatePropertyUseCase } from "../../../src/management/properties/update-property.js"

const ID = "prop-1"

function detail(overrides: Record<string, unknown> = {}) {
  return { id: ID, name: "Maple Court", ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updatePropertyRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  updatePropertyRecordMock.mockResolvedValue(detail())
})

describe("updatePropertyUseCase", () => {
  it("updates without a name when name is omitted", async () => {
    await updatePropertyUseCase(ID, { phone: "555-1212" } as never)
    expect(updatePropertyRecordMock).toHaveBeenCalledWith(ID, { phone: "555-1212" }, expect.anything())
  })

  it("rejects a blank name when one is supplied", async () => {
    await expect(updatePropertyUseCase(ID, { name: "   " } as never)).rejects.toMatchObject({
      code: "PROPERTY_VALIDATION_FAILED",
      status: 400,
    })
    expect(updatePropertyRecordMock).not.toHaveBeenCalled()
  })

  it("sends the name through when it changes", async () => {
    await updatePropertyUseCase(ID, { name: "New Name" } as never)
    expect(updatePropertyRecordMock).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ name: "New Name" }),
      expect.anything(),
    )
  })

  it("maps a P2025 to a 404 not-found", async () => {
    updatePropertyRecordMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(updatePropertyUseCase(ID, { name: "New Name" } as never)).rejects.toMatchObject({
      code: "PROPERTY_NOT_FOUND",
      status: 404,
    })
  })

  it("returns the updated record on success", async () => {
    const updated = detail({ name: "Updated" })
    updatePropertyRecordMock.mockResolvedValue(updated)
    expect(await updatePropertyUseCase(ID, { phone: "x" } as never)).toBe(updated)
  })
})
