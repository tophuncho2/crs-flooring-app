import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createPropertyRecordMock, propertyNameExistsMock, PrismaKnownError } =
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
      createPropertyRecordMock: vi.fn(),
      propertyNameExistsMock: vi.fn(),
      PrismaKnownError,
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  createPropertyRecord: createPropertyRecordMock,
  propertyNameExists: propertyNameExistsMock,
}))

import { createPropertyUseCase } from "../../../src/management/properties/create-property.js"
import { PropertyExecutionError } from "../../../src/management/properties/errors.js"

function input(overrides: Record<string, unknown> = {}) {
  return {
    managementCompanyId: null,
    name: "Maple Court",
    streetAddress: null,
    city: null,
    state: null,
    postalCode: null,
    phone: null,
    email: null,
    instructions: null,
    ...overrides,
  }
}

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: "prop-1",
    updatedAt: "2026-05-26T00:00:00.000Z",
    name: "Maple Court",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    instructions: "",
    fullAddress: "",
    managementCompany: null,
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createPropertyRecordMock.mockReset()
  propertyNameExistsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  propertyNameExistsMock.mockResolvedValue(false)
  createPropertyRecordMock.mockResolvedValue(detail())
})

describe("createPropertyUseCase", () => {
  it("rejects a blank name with 400 and never touches the database", async () => {
    await expect(createPropertyUseCase(input({ name: "   " }) as never)).rejects.toMatchObject({
      code: "PROPERTY_VALIDATION_FAILED",
      status: 400,
      field: "name",
    })
    expect(propertyNameExistsMock).not.toHaveBeenCalled()
    expect(createPropertyRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a duplicate normalized name with 409 before inserting", async () => {
    propertyNameExistsMock.mockResolvedValue(true)
    await expect(createPropertyUseCase(input() as never)).rejects.toMatchObject({
      code: "PROPERTY_NAME_CONFLICT",
      status: 409,
    })
    expect(createPropertyRecordMock).not.toHaveBeenCalled()
  })

  it("checks uniqueness against the normalized (trimmed, lower-cased) name", async () => {
    await createPropertyUseCase(input({ name: "  Maple Court  " }) as never)
    expect(propertyNameExistsMock).toHaveBeenCalledWith("maple court", undefined, expect.anything())
  })

  it("persists the record with the derived nameNormalized and returns it", async () => {
    const created = detail({ id: "prop-9" })
    createPropertyRecordMock.mockResolvedValue(created)

    const result = await createPropertyUseCase(input({ name: "Maple Court" }) as never)

    expect(result).toBe(created)
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Maple Court", nameNormalized: "maple court" }),
      expect.anything(),
    )
  })

  it("maps a P2002 nameNormalized violation to a 409 conflict", async () => {
    createPropertyRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["nameNormalized"] } }),
    )
    await expect(createPropertyUseCase(input() as never)).rejects.toMatchObject({
      code: "PROPERTY_NAME_CONFLICT",
      status: 409,
    })
  })

  it("re-throws unexpected (non-P2002) database errors unchanged", async () => {
    createPropertyRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createPropertyUseCase(input() as never)).rejects.toThrowError("boom")
    await expect(createPropertyUseCase(input() as never)).rejects.not.toBeInstanceOf(
      PropertyExecutionError,
    )
  })
})
