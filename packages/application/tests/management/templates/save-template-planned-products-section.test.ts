import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, applyTemplatePlannedProductsDiffMock, getProductByIdMock } =
  vi.hoisted(() => {
    return {
      withDatabaseTransactionMock: vi.fn(),
      applyTemplatePlannedProductsDiffMock: vi.fn(),
      getProductByIdMock: vi.fn(),
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  applyTemplatePlannedProductsDiff: applyTemplatePlannedProductsDiffMock,
  getProductById: getProductByIdMock,
}))

import { saveTemplatePlannedProductsSectionUseCase } from "../../../src/management/templates/planned-products/save-template-planned-products-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyTemplatePlannedProductsDiffMock.mockReset()
  getProductByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  applyTemplatePlannedProductsDiffMock.mockResolvedValue({ plannedProducts: [], tempIdMap: {} })
})

describe("saveTemplatePlannedProductsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveTemplatePlannedProductsSectionUseCase({ templateId: "tpl-1", diff: EMPTY_DIFF } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyTemplatePlannedProductsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail to the diff writer so items get stamped", async () => {
    await saveTemplatePlannedProductsSectionUseCase(
      { templateId: "tpl-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyTemplatePlannedProductsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateId: "tpl-1", actorEmail: ACTOR }),
    )
  })

  it("keeps a cleared unit blank on a MODIFIED row (does not re-seed from the product)", async () => {
    getProductByIdMock.mockResolvedValue({ id: "prod-1", unitId: "prod-unit-1" })
    await saveTemplatePlannedProductsSectionUseCase(
      {
        templateId: "tpl-1",
        diff: {
          added: [],
          modified: [
            { id: "item-1", form: { productId: "prod-1", unitId: "", quantity: "5", notes: "" } },
          ],
          deleted: [],
        },
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplatePlannedProductsDiffMock.mock.calls[0]
    // The user's clear survives — NOT replaced by the product's own unit.
    expect(diff.modified[0].input.unitId).toBe("")
  })

  it("does NOT seed a blank unit from the product on an ADDED row", async () => {
    getProductByIdMock.mockResolvedValue({ id: "prod-1", unitId: "prod-unit-1" })
    await saveTemplatePlannedProductsSectionUseCase(
      {
        templateId: "tpl-1",
        diff: {
          added: [{ tempId: "t1", form: { productId: "prod-1", unitId: "", quantity: "5", notes: "" } }],
          modified: [],
          deleted: [],
        },
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplatePlannedProductsDiffMock.mock.calls[0]
    // Added rows are NOT seeded from the product — the form's own value persists
    // (blank stays blank); the client owns the on-select seed.
    expect(diff.added[0].input.unitId).toBe("")
  })
})
