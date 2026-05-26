import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getManagementCompanyByIdMock,
  createManagementCompanyRecordMock,
  createPropertyRecordMock,
  PrismaKnownError,
} = vi.hoisted(() => {
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
    getManagementCompanyByIdMock: vi.fn(),
    createManagementCompanyRecordMock: vi.fn(),
    createPropertyRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  getManagementCompanyById: getManagementCompanyByIdMock,
  createManagementCompanyRecord: createManagementCompanyRecordMock,
  createPropertyRecord: createPropertyRecordMock,
}))

import { createPropertyHubUseCase } from "../../../src/management/properties/create-property-hub.js"

function mcFields(overrides: Record<string, unknown> = {}) {
  return {
    name: "Acme",
    streetAddress: null,
    city: null,
    state: null,
    postalCode: null,
    phone: null,
    email: null,
    ...overrides,
  }
}

function propFields(overrides: Record<string, unknown> = {}) {
  return {
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

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getManagementCompanyByIdMock.mockReset()
  createManagementCompanyRecordMock.mockReset()
  createPropertyRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getManagementCompanyByIdMock.mockResolvedValue({ id: "mc-1", name: "Acme" })
  createManagementCompanyRecordMock.mockResolvedValue({ id: "mc-1", name: "Acme" })
  createPropertyRecordMock.mockResolvedValue({ id: "prop-1", name: "Maple Court" })
})

describe("createPropertyHubUseCase", () => {
  it("rejects an empty form (no MC create, no property create) with 400", async () => {
    await expect(
      createPropertyHubUseCase({
        managementCompany: { mode: "none" },
        property: { mode: "none" },
      } as never),
    ).rejects.toMatchObject({ code: "PROPERTY_VALIDATION_FAILED", status: 400 })
    expect(createPropertyRecordMock).not.toHaveBeenCalled()
    expect(createManagementCompanyRecordMock).not.toHaveBeenCalled()
  })

  it("maps a missing linked management company to a 404", async () => {
    getManagementCompanyByIdMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(
      createPropertyHubUseCase({
        managementCompany: { mode: "link", id: "mc-x" },
        property: { mode: "create", fields: propFields() },
      } as never),
    ).rejects.toMatchObject({ code: "MANAGEMENT_COMPANY_NOT_FOUND", status: 404 })
  })

  it("maps a management-company name conflict to a 409", async () => {
    createManagementCompanyRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(
      createPropertyHubUseCase({
        managementCompany: { mode: "create", fields: mcFields() },
        property: { mode: "create", fields: propFields() },
      } as never),
    ).rejects.toMatchObject({ code: "MANAGEMENT_COMPANY_NAME_CONFLICT", status: 409 })
  })

  it("maps a property name conflict to a 409", async () => {
    createPropertyRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["nameNormalized"] } }),
    )
    await expect(
      createPropertyHubUseCase({
        managementCompany: { mode: "none" },
        property: { mode: "create", fields: propFields() },
      } as never),
    ).rejects.toMatchObject({ code: "PROPERTY_NAME_CONFLICT", status: 409 })
  })

  it("creates both records and threads the new MC id into the property", async () => {
    createManagementCompanyRecordMock.mockResolvedValue({ id: "mc-9", name: "Acme" })
    createPropertyRecordMock.mockResolvedValue({ id: "prop-9", name: "Maple Court" })

    const result = await createPropertyHubUseCase({
      managementCompany: { mode: "create", fields: mcFields() },
      property: { mode: "create", fields: propFields({ name: "Maple Court" }) },
    } as never)

    expect(result).toEqual({
      managementCompany: { id: "mc-9", name: "Acme" },
      property: { id: "prop-9", name: "Maple Court" },
    })
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ managementCompanyId: "mc-9", nameNormalized: "maple court" }),
      expect.anything(),
    )
  })

  it("links an existing MC and threads its id into the created property", async () => {
    getManagementCompanyByIdMock.mockResolvedValue({ id: "mc-7", name: "Linked" })
    createPropertyRecordMock.mockResolvedValue({ id: "prop-7", name: "Maple Court" })

    const result = await createPropertyHubUseCase({
      managementCompany: { mode: "link", id: "mc-7" },
      property: { mode: "create", fields: propFields() },
    } as never)

    expect(result.managementCompany).toEqual({ id: "mc-7", name: "Linked" })
    expect(createManagementCompanyRecordMock).not.toHaveBeenCalled()
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ managementCompanyId: "mc-7" }),
      expect.anything(),
    )
  })

  it("creates a property alone with a null management company", async () => {
    const result = await createPropertyHubUseCase({
      managementCompany: { mode: "none" },
      property: { mode: "create", fields: propFields() },
    } as never)

    expect(result.managementCompany).toBeNull()
    expect(result.property).toEqual({ id: "prop-1", name: "Maple Court" })
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ managementCompanyId: null }),
      expect.anything(),
    )
  })
})
