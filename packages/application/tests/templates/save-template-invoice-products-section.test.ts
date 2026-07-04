import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, applyTemplateInvoiceProductsDiffMock, getProductByIdMock } =
  vi.hoisted(() => {
    return {
      withDatabaseTransactionMock: vi.fn(),
      applyTemplateInvoiceProductsDiffMock: vi.fn(),
      getProductByIdMock: vi.fn(),
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  applyTemplateInvoiceProductsDiff: applyTemplateInvoiceProductsDiffMock,
  getProductById: getProductByIdMock,
}))

import { saveTemplateInvoiceProductsSectionUseCase } from "../../src/templates/invoice-products/save-template-invoice-products-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyTemplateInvoiceProductsDiffMock.mockReset()
  getProductByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  applyTemplateInvoiceProductsDiffMock.mockResolvedValue({ invoiceProducts: [], tempIdMap: {} })
})

describe("saveTemplateInvoiceProductsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveTemplateInvoiceProductsSectionUseCase({ templateId: "tpl-1", diff: EMPTY_DIFF } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyTemplateInvoiceProductsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail to the diff writer so items get stamped", async () => {
    await saveTemplateInvoiceProductsSectionUseCase(
      { templateId: "tpl-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyTemplateInvoiceProductsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateId: "tpl-1", actorEmail: ACTOR }),
    )
  })

  it("keeps a cleared unit blank on a MODIFIED row (does not re-seed from the product)", async () => {
    getProductByIdMock.mockResolvedValue({ id: "prod-1", unitId: "prod-unit-1" })
    await saveTemplateInvoiceProductsSectionUseCase(
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
    const [, diff] = applyTemplateInvoiceProductsDiffMock.mock.calls[0]
    // The user's clear survives — NOT replaced by the product's own unit.
    expect(diff.modified[0].input.unitId).toBe("")
  })

  it("does NOT seed a blank unit from the product on an ADDED row", async () => {
    getProductByIdMock.mockResolvedValue({ id: "prod-1", unitId: "prod-unit-1" })
    await saveTemplateInvoiceProductsSectionUseCase(
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
    const [, diff] = applyTemplateInvoiceProductsDiffMock.mock.calls[0]
    // Added rows are NOT seeded from the product — the form's own value persists
    // (blank stays blank); the client owns the on-select seed.
    expect(diff.added[0].input.unitId).toBe("")
  })

  it("rejects an ADDED row with no product before writing", async () => {
    await expect(
      saveTemplateInvoiceProductsSectionUseCase(
        {
          templateId: "tpl-1",
          diff: {
            added: [{ tempId: "t1", form: { productId: "", unitId: "", quantity: "", notes: "" } }],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "TEMPLATE_INVOICE_PRODUCT_VALIDATION_FAILED", status: 400 })
    expect(applyTemplateInvoiceProductsDiffMock).not.toHaveBeenCalled()
  })
})
