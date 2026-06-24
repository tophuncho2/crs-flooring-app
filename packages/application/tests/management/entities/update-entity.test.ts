import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updateManagementCompanyRecordMock, PrismaKnownError } = vi.hoisted(
  () => {
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
      updateManagementCompanyRecordMock: vi.fn(),
      PrismaKnownError,
    }
  },
)

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updateManagementCompanyRecord: updateManagementCompanyRecordMock,
}))

import { updateManagementCompanyUseCase } from "../../../src/management/management-companies/update-management-company.js"

const ID = "mc-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updateManagementCompanyRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  updateManagementCompanyRecordMock.mockResolvedValue({ id: ID, name: "Acme" })
})

describe("updateManagementCompanyUseCase", () => {
  it("skips name validation when name is omitted and forwards the input", async () => {
    await updateManagementCompanyUseCase(ID, { phone: "555" } as never)
    expect(updateManagementCompanyRecordMock).toHaveBeenCalledWith(ID, { phone: "555" }, expect.anything())
  })

  it("rejects a blank name when one is supplied", async () => {
    await expect(updateManagementCompanyUseCase(ID, { name: "   " } as never)).rejects.toMatchObject({
      code: "MANAGEMENT_COMPANY_VALIDATION_FAILED",
      status: 400,
    })
    expect(updateManagementCompanyRecordMock).not.toHaveBeenCalled()
  })

  it("returns the updated record on success", async () => {
    const updated = { id: ID, name: "Renamed" }
    updateManagementCompanyRecordMock.mockResolvedValue(updated)
    expect(await updateManagementCompanyUseCase(ID, { name: "Renamed" } as never)).toBe(updated)
  })

  it("maps a P2025 to a 404 not-found", async () => {
    updateManagementCompanyRecordMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(updateManagementCompanyUseCase(ID, { name: "Renamed" } as never)).rejects.toMatchObject({
      code: "MANAGEMENT_COMPANY_NOT_FOUND",
      status: 404,
    })
  })
})
