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

import { createJobTypeUseCase } from "../../src/job-types/create-job-type.js"
import { JobTypeExecutionError } from "../../src/job-types/errors.js"

const ACTOR = "user@x.com"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createJobTypeRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createJobTypeRecordMock.mockResolvedValue({
    id: "jt-1",
    name: "Install",
    createdBy: ACTOR,
    updatedBy: ACTOR,
  })
})

describe("createJobTypeUseCase", () => {
  it("rejects an empty name with 400 and never inserts", async () => {
    await expect(createJobTypeUseCase({ name: "" } as never, ACTOR)).rejects.toMatchObject({
      code: "JOB_TYPE_VALIDATION_FAILED",
      status: 400,
      field: "name",
    })
    expect(createJobTypeRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a whitespace-only name with 400", async () => {
    await expect(createJobTypeUseCase({ name: "   " } as never, ACTOR)).rejects.toMatchObject({
      code: "JOB_TYPE_VALIDATION_FAILED",
      status: 400,
    })
    expect(createJobTypeRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a blank actor email and never inserts", async () => {
    await expect(createJobTypeUseCase({ name: "Install" } as never, "   ")).rejects.toThrowError(
      /actorEmail/,
    )
    expect(createJobTypeRecordMock).not.toHaveBeenCalled()
  })

  it("returns the created record on success", async () => {
    const created = { id: "jt-9", name: "Install", createdBy: ACTOR, updatedBy: ACTOR }
    createJobTypeRecordMock.mockResolvedValue(created)
    expect(await createJobTypeUseCase({ name: "Install" } as never, ACTOR)).toBe(created)
  })

  it("stamps the actor email as createdBy and updatedBy on insert", async () => {
    await createJobTypeUseCase({ name: "Install" } as never, ACTOR)
    expect(createJobTypeRecordMock).toHaveBeenCalledWith(
      { name: "Install", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("maps a P2002 name violation to a 409 conflict", async () => {
    createJobTypeRecordMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(createJobTypeUseCase({ name: "Install" } as never, ACTOR)).rejects.toMatchObject({
      code: "JOB_TYPE_NAME_CONFLICT",
      status: 409,
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createJobTypeRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createJobTypeUseCase({ name: "Install" } as never, ACTOR)).rejects.toThrowError(
      "boom",
    )
    await expect(
      createJobTypeUseCase({ name: "Install" } as never, ACTOR),
    ).rejects.not.toBeInstanceOf(JobTypeExecutionError)
  })
})
