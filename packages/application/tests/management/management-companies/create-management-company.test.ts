import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createManagementCompanyRecordMock, PrismaKnownError } = vi.hoisted(
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
      createManagementCompanyRecordMock: vi.fn(),
      PrismaKnownError,
    }
  },
)

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  createManagementCompanyRecord: createManagementCompanyRecordMock,
}))

import { createManagementCompanyUseCase } from "../../../src/management/management-companies/create-management-company.js"
import { ManagementCompanyExecutionError } from "../../../src/management/management-companies/errors.js"

function input(overrides: Record<string, unknown> = {}) {
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

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createManagementCompanyRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createManagementCompanyRecordMock.mockResolvedValue({ id: "mc-1", name: "Acme" })
})

describe("createManagementCompanyUseCase", () => {
  it("rejects a blank name with 400 and never inserts", async () => {
    await expect(createManagementCompanyUseCase(input({ name: "  " }) as never)).rejects.toMatchObject({
      code: "MANAGEMENT_COMPANY_VALIDATION_FAILED",
      status: 400,
      field: "name",
    })
    expect(createManagementCompanyRecordMock).not.toHaveBeenCalled()
  })

  it("returns the created record on success", async () => {
    const created = { id: "mc-9", name: "Acme" }
    createManagementCompanyRecordMock.mockResolvedValue(created)
    expect(await createManagementCompanyUseCase(input() as never)).toBe(created)
  })

  it("maps a P2002 name violation to a 409 conflict", async () => {
    createManagementCompanyRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(createManagementCompanyUseCase(input() as never)).rejects.toMatchObject({
      code: "MANAGEMENT_COMPANY_NAME_CONFLICT",
      status: 409,
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createManagementCompanyRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createManagementCompanyUseCase(input() as never)).rejects.toThrowError("boom")
    await expect(createManagementCompanyUseCase(input() as never)).rejects.not.toBeInstanceOf(
      ManagementCompanyExecutionError,
    )
  })
})
