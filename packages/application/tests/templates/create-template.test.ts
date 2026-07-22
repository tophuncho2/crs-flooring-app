import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createTemplateRecordMock, getTemplateByIdMock } = vi.hoisted(
  () => {
    return {
      withDatabaseTransactionMock: vi.fn(),
      createTemplateRecordMock: vi.fn(),
      getTemplateByIdMock: vi.fn(),
    }
  },
)

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  createTemplateRecord: createTemplateRecordMock,
  // Full record read on the pool after the tx commits (the return value).
  getTemplateById: getTemplateByIdMock,
}))

import { createTemplateUseCase } from "../../src/templates/create-template.js"
import { TemplateExecutionError } from "../../src/templates/errors.js"

const ACTOR = "actor@example.com"

function input(overrides: Record<string, unknown> = {}) {
  return {
    propertyId: null,
    jobTypeId: null,
    warehouseId: null,
    unitType: "2BR",
    customerName: null,
    description: null,
    internalNotes: null,
    installerInstructions: null,
    totalTransaction: null,
    taxRate: null,
    ...overrides,
  }
}

function detail(overrides: Record<string, unknown> = {}) {
  return { id: "tpl-1", templateNumber: "TP-1", createdBy: null, updatedBy: null, ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createTemplateRecordMock.mockReset()
  getTemplateByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // Lean write returns just the id; the pool enrich returns the full record.
  createTemplateRecordMock.mockResolvedValue({ id: "tpl-1" })
  getTemplateByIdMock.mockResolvedValue(detail())
})

describe("createTemplateUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(createTemplateUseCase(input() as never, "   ")).rejects.toThrowError(/actorEmail/)
    expect(createTemplateRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a blank unitType with 400 and never touches the database", async () => {
    await expect(
      createTemplateUseCase(input({ unitType: "   " }) as never, ACTOR),
    ).rejects.toMatchObject({
      code: "TEMPLATE_VALIDATION_FAILED",
      status: 400,
      field: "unitType",
    })
    expect(createTemplateRecordMock).not.toHaveBeenCalled()
  })

  it("persists the record, stamping createdBy/updatedBy, and returns the pool-enriched record", async () => {
    createTemplateRecordMock.mockResolvedValue({ id: "tpl-9" })
    const enriched = detail({ id: "tpl-9" })
    getTemplateByIdMock.mockResolvedValue(enriched)

    const result = await createTemplateUseCase(
      input({
        unitType: "3BR",
        customerName: "Jane Doe",
        totalTransaction: "1500.00",
        taxRate: "8.375",
      }) as never,
      ACTOR,
    )

    expect(result).toBe(enriched)
    expect(createTemplateRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        unitType: "3BR",
        customerName: "Jane Doe",
        totalTransaction: "1500.00",
        taxRate: "8.375",
        createdBy: ACTOR,
        updatedBy: ACTOR,
      }),
      expect.anything(),
    )
    // Enrich reads the full record on the pool by the just-written id.
    expect(getTemplateByIdMock).toHaveBeenCalledWith("tpl-9", { withNeighbors: false })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createTemplateRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createTemplateUseCase(input() as never, ACTOR)).rejects.toThrowError("boom")
    await expect(createTemplateUseCase(input() as never, ACTOR)).rejects.not.toBeInstanceOf(
      TemplateExecutionError,
    )
  })
})
