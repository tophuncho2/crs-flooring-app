import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createTemplateRecordMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    createTemplateRecordMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  createTemplateRecord: createTemplateRecordMock,
}))

import { createTemplateUseCase } from "../../../src/management/templates/create-template.js"
import { TemplateExecutionError } from "../../../src/management/templates/errors.js"

const ACTOR = "actor@example.com"

function input(overrides: Record<string, unknown> = {}) {
  return {
    propertyId: null,
    jobTypeId: null,
    warehouseId: null,
    unitType: "2BR",
    description: null,
    internalNotes: null,
    installerInstructions: null,
    ...overrides,
  }
}

function detail(overrides: Record<string, unknown> = {}) {
  return { id: "tpl-1", templateNumber: "TP-1", createdBy: null, updatedBy: null, ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createTemplateRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createTemplateRecordMock.mockResolvedValue(detail())
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

  it("persists the record, stamping createdBy/updatedBy, and returns it", async () => {
    const created = detail({ id: "tpl-9" })
    createTemplateRecordMock.mockResolvedValue(created)

    const result = await createTemplateUseCase(input({ unitType: "3BR" }) as never, ACTOR)

    expect(result).toBe(created)
    expect(createTemplateRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ unitType: "3BR", createdBy: ACTOR, updatedBy: ACTOR }),
      expect.anything(),
    )
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createTemplateRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createTemplateUseCase(input() as never, ACTOR)).rejects.toThrowError("boom")
    await expect(createTemplateUseCase(input() as never, ACTOR)).rejects.not.toBeInstanceOf(
      TemplateExecutionError,
    )
  })
})
