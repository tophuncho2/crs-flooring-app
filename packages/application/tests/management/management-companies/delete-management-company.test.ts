import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  deleteManagementCompanyRecordByIdMock,
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
    deleteManagementCompanyRecordByIdMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  deleteManagementCompanyRecordById: deleteManagementCompanyRecordByIdMock,
}))

import { deleteManagementCompanyUseCase } from "../../../src/management/management-companies/delete-management-company.js"

const ID = "mc-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  deleteManagementCompanyRecordByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  deleteManagementCompanyRecordByIdMock.mockResolvedValue(undefined)
})

describe("deleteManagementCompanyUseCase", () => {
  it("deletes and returns ok regardless of linked properties", async () => {
    expect(await deleteManagementCompanyUseCase(ID)).toEqual({ ok: true })
    expect(deleteManagementCompanyRecordByIdMock).toHaveBeenCalledWith(ID, expect.anything())
  })

  it("maps a P2025 to a 404 not-found", async () => {
    deleteManagementCompanyRecordByIdMock.mockRejectedValue(
      new PrismaKnownError("missing", { code: "P2025" }),
    )
    await expect(deleteManagementCompanyUseCase(ID)).rejects.toMatchObject({
      code: "MANAGEMENT_COMPANY_NOT_FOUND",
      status: 404,
    })
  })
})
