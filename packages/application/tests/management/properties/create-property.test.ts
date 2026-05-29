import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createPropertyRecordMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    createPropertyRecordMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  createPropertyRecord: createPropertyRecordMock,
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

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createPropertyRecordMock.mockResolvedValue(detail())
})

describe("createPropertyUseCase", () => {
  it("rejects a blank name with 400 and never touches the database", async () => {
    await expect(createPropertyUseCase(input({ name: "   " }) as never)).rejects.toMatchObject({
      code: "PROPERTY_VALIDATION_FAILED",
      status: 400,
      field: "name",
    })
    expect(createPropertyRecordMock).not.toHaveBeenCalled()
  })

  it("persists the record and returns it", async () => {
    const created = detail({ id: "prop-9" })
    createPropertyRecordMock.mockResolvedValue(created)

    const result = await createPropertyUseCase(input({ name: "Maple Court" }) as never)

    expect(result).toBe(created)
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Maple Court" }),
      expect.anything(),
    )
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createPropertyRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createPropertyUseCase(input() as never)).rejects.toThrowError("boom")
    await expect(createPropertyUseCase(input() as never)).rejects.not.toBeInstanceOf(
      PropertyExecutionError,
    )
  })
})
