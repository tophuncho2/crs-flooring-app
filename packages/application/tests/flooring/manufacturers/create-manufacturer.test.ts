import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  manufacturerCompanyNameExistsMock,
  createManufacturerPrimaryRecordMock,
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
    manufacturerCompanyNameExistsMock: vi.fn(),
    createManufacturerPrimaryRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  manufacturerCompanyNameExists: manufacturerCompanyNameExistsMock,
  createManufacturerPrimaryRecord: createManufacturerPrimaryRecordMock,
}))

import { createManufacturerUseCase } from "../../../src/flooring/manufacturers/create-manufacturer.js"
import { ManufacturerExecutionError } from "../../../src/flooring/manufacturers/errors.js"

function input(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "Shaw Floors",
    agentName: "",
    website: "",
    phone: "",
    email: "",
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  manufacturerCompanyNameExistsMock.mockReset()
  createManufacturerPrimaryRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  manufacturerCompanyNameExistsMock.mockResolvedValue(false)
  createManufacturerPrimaryRecordMock.mockResolvedValue({ id: "mfr-1", companyName: "Shaw Floors" })
})

describe("createManufacturerUseCase", () => {
  it("rejects a duplicate normalized name with 409 before inserting", async () => {
    manufacturerCompanyNameExistsMock.mockResolvedValue(true)
    await expect(createManufacturerUseCase(input() as never)).rejects.toMatchObject({
      code: "MANUFACTURER_NAME_CONFLICT",
      status: 409,
      field: "companyName",
    })
    expect(createManufacturerPrimaryRecordMock).not.toHaveBeenCalled()
  })

  it("checks uniqueness against the normalized (trimmed, lower-cased) name with no current id", async () => {
    await createManufacturerUseCase(input({ companyName: "  Shaw Floors  " }) as never)
    expect(manufacturerCompanyNameExistsMock).toHaveBeenCalledWith(
      "shaw floors",
      undefined,
      expect.anything(),
    )
  })

  it("persists the record with the derived companyNameNormalized and returns it", async () => {
    const created = { id: "mfr-9", companyName: "Shaw Floors" }
    createManufacturerPrimaryRecordMock.mockResolvedValue(created)

    const result = await createManufacturerUseCase(input({ companyName: "Shaw Floors" }) as never)

    expect(result).toBe(created)
    expect(createManufacturerPrimaryRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: "Shaw Floors", companyNameNormalized: "shaw floors" }),
      expect.anything(),
    )
  })

  it("maps a P2002 violation on insert to a 409 conflict", async () => {
    createManufacturerPrimaryRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002" }),
    )
    await expect(createManufacturerUseCase(input() as never)).rejects.toMatchObject({
      code: "MANUFACTURER_NAME_CONFLICT",
      status: 409,
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createManufacturerPrimaryRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createManufacturerUseCase(input() as never)).rejects.toThrowError("boom")
    await expect(createManufacturerUseCase(input() as never)).rejects.not.toBeInstanceOf(
      ManufacturerExecutionError,
    )
  })
})
