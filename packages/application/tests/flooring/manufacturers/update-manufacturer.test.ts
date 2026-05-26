import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  manufacturerCompanyNameExistsMock,
  updateManufacturerPrimaryRecordMock,
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
    updateManufacturerPrimaryRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  manufacturerCompanyNameExists: manufacturerCompanyNameExistsMock,
  updateManufacturerPrimaryRecord: updateManufacturerPrimaryRecordMock,
}))

import { updateManufacturerUseCase } from "../../../src/flooring/manufacturers/update-manufacturer.js"
import { ManufacturerExecutionError } from "../../../src/flooring/manufacturers/errors.js"

const ID = "mfr-1"

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
  updateManufacturerPrimaryRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  manufacturerCompanyNameExistsMock.mockResolvedValue(false)
  updateManufacturerPrimaryRecordMock.mockResolvedValue({ id: ID, companyName: "Shaw Floors" })
})

describe("updateManufacturerUseCase", () => {
  it("checks uniqueness against the normalized name excluding the current id", async () => {
    await updateManufacturerUseCase(ID, input({ companyName: "  Shaw Floors  " }) as never)
    expect(manufacturerCompanyNameExistsMock).toHaveBeenCalledWith(
      "shaw floors",
      ID,
      expect.anything(),
    )
  })

  it("rejects a duplicate normalized name with 409 before updating", async () => {
    manufacturerCompanyNameExistsMock.mockResolvedValue(true)
    await expect(updateManufacturerUseCase(ID, input() as never)).rejects.toMatchObject({
      code: "MANUFACTURER_NAME_CONFLICT",
      status: 409,
      field: "companyName",
    })
    expect(updateManufacturerPrimaryRecordMock).not.toHaveBeenCalled()
  })

  it("persists with the derived companyNameNormalized and returns the record", async () => {
    const updated = { id: ID, companyName: "Shaw Floors" }
    updateManufacturerPrimaryRecordMock.mockResolvedValue(updated)

    const result = await updateManufacturerUseCase(ID, input() as never)

    expect(result).toBe(updated)
    expect(updateManufacturerPrimaryRecordMock).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ companyNameNormalized: "shaw floors" }),
      expect.anything(),
    )
  })

  it("maps a P2002 violation on update to a 409 conflict", async () => {
    updateManufacturerPrimaryRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002" }),
    )
    await expect(updateManufacturerUseCase(ID, input() as never)).rejects.toMatchObject({
      code: "MANUFACTURER_NAME_CONFLICT",
      status: 409,
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    updateManufacturerPrimaryRecordMock.mockRejectedValue(new Error("boom"))
    await expect(updateManufacturerUseCase(ID, input() as never)).rejects.toThrowError("boom")
    await expect(updateManufacturerUseCase(ID, input() as never)).rejects.not.toBeInstanceOf(
      ManufacturerExecutionError,
    )
  })
})
