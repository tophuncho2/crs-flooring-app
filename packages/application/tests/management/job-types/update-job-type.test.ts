import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updateJobTypeRecordMock, PrismaKnownError } = vi.hoisted(() => {
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
    updateJobTypeRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  updateJobTypeRecord: updateJobTypeRecordMock,
}))

import { updateJobTypeUseCase } from "../../../src/management/job-types/update-job-type.js"
import { JobTypeExecutionError } from "../../../src/management/job-types/errors.js"

const ID = "jt-1"
const ACTOR = "user@x.com"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updateJobTypeRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  updateJobTypeRecordMock.mockResolvedValue({ id: ID, name: "Renamed", updatedBy: ACTOR })
})

describe("updateJobTypeUseCase", () => {
  it("rejects a blank name (when provided) with 400 and never updates", async () => {
    await expect(updateJobTypeUseCase(ID, { name: "   " }, ACTOR)).rejects.toMatchObject({
      code: "JOB_TYPE_VALIDATION_FAILED",
      status: 400,
      field: "name",
    })
    expect(updateJobTypeRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a blank actor email and never updates", async () => {
    await expect(updateJobTypeUseCase(ID, { name: "Renamed" }, "   ")).rejects.toThrowError(
      /actorEmail/,
    )
    expect(updateJobTypeRecordMock).not.toHaveBeenCalled()
  })

  it("returns the updated record on success", async () => {
    const updated = { id: ID, name: "Renamed", updatedBy: ACTOR }
    updateJobTypeRecordMock.mockResolvedValue(updated)
    expect(await updateJobTypeUseCase(ID, { name: "Renamed" }, ACTOR)).toBe(updated)
  })

  it("stamps the actor email as updatedBy", async () => {
    await updateJobTypeUseCase(ID, { name: "Renamed" }, ACTOR)
    expect(updateJobTypeRecordMock).toHaveBeenCalledWith(
      ID,
      { name: "Renamed", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("maps a P2002 name violation to a 409 conflict", async () => {
    updateJobTypeRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(updateJobTypeUseCase(ID, { name: "Renamed" }, ACTOR)).rejects.toMatchObject({
      code: "JOB_TYPE_NAME_CONFLICT",
      status: 409,
    })
  })

  it("maps a P2025 to a 404 not-found", async () => {
    updateJobTypeRecordMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(updateJobTypeUseCase(ID, { name: "Renamed" }, ACTOR)).rejects.toMatchObject({
      code: "JOB_TYPE_NOT_FOUND",
      status: 404,
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    updateJobTypeRecordMock.mockRejectedValue(new Error("boom"))
    await expect(updateJobTypeUseCase(ID, { name: "Renamed" }, ACTOR)).rejects.toThrowError("boom")
    await expect(updateJobTypeUseCase(ID, { name: "Renamed" }, ACTOR)).rejects.not.toBeInstanceOf(
      JobTypeExecutionError,
    )
  })
})
