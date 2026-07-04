import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updateTemplateRecordMock, PrismaKnownError } = vi.hoisted(() => {
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
    updateTemplateRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updateTemplateRecord: updateTemplateRecordMock,
}))

import { updateTemplateUseCase } from "../../../src/management/templates/update-template.js"

const ID = "tpl-1"
const ACTOR = "actor@example.com"

function detail(overrides: Record<string, unknown> = {}) {
  return { id: ID, templateNumber: "TP-1", createdBy: null, updatedBy: null, ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updateTemplateRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  updateTemplateRecordMock.mockResolvedValue(detail())
})

describe("updateTemplateUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      updateTemplateUseCase(ID, { description: "x" } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(updateTemplateRecordMock).not.toHaveBeenCalled()
  })

  it("updates without a unitType when omitted, stamping updatedBy", async () => {
    await updateTemplateUseCase(ID, { description: "New desc" } as never, ACTOR)
    expect(updateTemplateRecordMock).toHaveBeenCalledWith(
      ID,
      { description: "New desc", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("rejects a blank unitType when one is supplied", async () => {
    await expect(
      updateTemplateUseCase(ID, { unitType: "   " } as never, ACTOR),
    ).rejects.toMatchObject({
      code: "TEMPLATE_VALIDATION_FAILED",
      status: 400,
    })
    expect(updateTemplateRecordMock).not.toHaveBeenCalled()
  })

  it("sends the unitType through when it changes, stamping updatedBy", async () => {
    await updateTemplateUseCase(ID, { unitType: "3BR" } as never, ACTOR)
    expect(updateTemplateRecordMock).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ unitType: "3BR", updatedBy: ACTOR }),
      expect.anything(),
    )
  })

  it("maps a P2025 to a 404 not-found", async () => {
    updateTemplateRecordMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(
      updateTemplateUseCase(ID, { unitType: "3BR" } as never, ACTOR),
    ).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND",
      status: 404,
    })
  })

  it("returns the updated record on success", async () => {
    const updated = detail({ templateNumber: "TP-2" })
    updateTemplateRecordMock.mockResolvedValue(updated)
    expect(await updateTemplateUseCase(ID, { description: "x" } as never, ACTOR)).toBe(updated)
  })
})
