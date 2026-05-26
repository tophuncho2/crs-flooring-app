import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updatePropertyRecordMock, propertyNameExistsMock, PrismaKnownError } =
  vi.hoisted(() => {
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
      propertyNameExistsMock: vi.fn(),
      PrismaKnownError,
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  updatePropertyRecord: updatePropertyRecordMock,
  propertyNameExists: propertyNameExistsMock,
}))

import { updatePropertyUseCase } from "../../../src/management/properties/update-property.js"

const ID = "prop-1"

function detail(overrides: Record<string, unknown> = {}) {
  return { id: ID, name: "Maple Court", ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updatePropertyRecordMock.mockReset()
  propertyNameExistsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  propertyNameExistsMock.mockResolvedValue(false)
  updatePropertyRecordMock.mockResolvedValue(detail())
})

describe("updatePropertyUseCase", () => {
  it("skips name validation and the uniqueness check when name is omitted", async () => {
    await updatePropertyUseCase(ID, { phone: "555-1212" } as never)
    expect(propertyNameExistsMock).not.toHaveBeenCalled()
    expect(updatePropertyRecordMock).toHaveBeenCalledWith(ID, { phone: "555-1212" }, expect.anything())
  })

  it("rejects a blank name when one is supplied", async () => {
    await expect(updatePropertyUseCase(ID, { name: "   " } as never)).rejects.toMatchObject({
      code: "PROPERTY_VALIDATION_FAILED",
      status: 400,
    })
    expect(updatePropertyRecordMock).not.toHaveBeenCalled()
  })

  it("excludes the current id from the uniqueness check", async () => {
    await updatePropertyUseCase(ID, { name: "  New Name " } as never)
    expect(propertyNameExistsMock).toHaveBeenCalledWith("new name", ID, expect.anything())
  })

  it("rejects a duplicate name with 409 before updating", async () => {
    propertyNameExistsMock.mockResolvedValue(true)
    await expect(updatePropertyUseCase(ID, { name: "Taken" } as never)).rejects.toMatchObject({
      code: "PROPERTY_NAME_CONFLICT",
      status: 409,
    })
    expect(updatePropertyRecordMock).not.toHaveBeenCalled()
  })

  it("sends the derived nameNormalized when the name changes", async () => {
    await updatePropertyUseCase(ID, { name: "New Name" } as never)
    expect(updatePropertyRecordMock).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ name: "New Name", nameNormalized: "new name" }),
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

  it("maps a P2002 nameNormalized violation to a 409 conflict", async () => {
    updatePropertyRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["nameNormalized"] } }),
    )
    await expect(updatePropertyUseCase(ID, { name: "New Name" } as never)).rejects.toMatchObject({
      code: "PROPERTY_NAME_CONFLICT",
      status: 409,
    })
  })

  it("returns the updated record on success", async () => {
    const updated = detail({ name: "Updated" })
    updatePropertyRecordMock.mockResolvedValue(updated)
    expect(await updatePropertyUseCase(ID, { phone: "x" } as never)).toBe(updated)
  })
})
