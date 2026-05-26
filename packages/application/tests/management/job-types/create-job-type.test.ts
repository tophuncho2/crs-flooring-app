import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createJobTypeRecordMock, PrismaKnownError } = vi.hoisted(() => {
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
    createJobTypeRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  createJobTypeRecord: createJobTypeRecordMock,
}))

import { createJobTypeUseCase } from "../../../src/management/job-types/create-job-type.js"
import { JobTypeExecutionError } from "../../../src/management/job-types/errors.js"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createJobTypeRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createJobTypeRecordMock.mockResolvedValue({ id: "jt-1", name: "Install" })
})

describe("createJobTypeUseCase", () => {
  it("rejects an empty name with 400 and never inserts", async () => {
    await expect(createJobTypeUseCase({ name: "" } as never)).rejects.toMatchObject({
      code: "JOB_TYPE_VALIDATION_FAILED",
      status: 400,
      field: "name",
    })
    expect(createJobTypeRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a whitespace-only name with 400", async () => {
    await expect(createJobTypeUseCase({ name: "   " } as never)).rejects.toMatchObject({
      code: "JOB_TYPE_VALIDATION_FAILED",
      status: 400,
    })
    expect(createJobTypeRecordMock).not.toHaveBeenCalled()
  })

  it("returns the created record on success", async () => {
    const created = { id: "jt-9", name: "Install" }
    createJobTypeRecordMock.mockResolvedValue(created)
    expect(await createJobTypeUseCase({ name: "Install" } as never)).toBe(created)
  })

  it("maps a P2002 name violation to a 409 conflict", async () => {
    createJobTypeRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(createJobTypeUseCase({ name: "Install" } as never)).rejects.toMatchObject({
      code: "JOB_TYPE_NAME_CONFLICT",
      status: 409,
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createJobTypeRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createJobTypeUseCase({ name: "Install" } as never)).rejects.toThrowError("boom")
    await expect(createJobTypeUseCase({ name: "Install" } as never)).rejects.not.toBeInstanceOf(
      JobTypeExecutionError,
    )
  })
})
