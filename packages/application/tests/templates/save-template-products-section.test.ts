import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  applyTemplatePlannedProductsDiffMock,
  applyTemplateServiceItemsDiffMock,
  applyTemplateCommissionsDiffMock,
  getProductByIdMock,
  listTemplatePlannedProductsMock,
  listTemplateServiceItemsMock,
  listTemplateCommissionsMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyTemplatePlannedProductsDiffMock: vi.fn(),
    applyTemplateServiceItemsDiffMock: vi.fn(),
    applyTemplateCommissionsDiffMock: vi.fn(),
    getProductByIdMock: vi.fn(),
    listTemplatePlannedProductsMock: vi.fn(),
    listTemplateServiceItemsMock: vi.fn(),
    listTemplateCommissionsMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  // Pool sentinel — the use case guards + enriches on `client ?? db`.
  db: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  applyTemplatePlannedProductsDiff: applyTemplatePlannedProductsDiffMock,
  applyTemplateServiceItemsDiff: applyTemplateServiceItemsDiffMock,
  applyTemplateCommissionsDiff: applyTemplateCommissionsDiffMock,
  getProductById: getProductByIdMock,
  listTemplatePlannedProducts: listTemplatePlannedProductsMock,
  listTemplateServiceItems: listTemplateServiceItemsMock,
  listTemplateCommissions: listTemplateCommissionsMock,
}))

import { saveTemplateProductsSectionUseCase } from "../../src/templates/products/save-template-products-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }
const EMPTY_INPUT = {
  templateId: "tpl-1",
  plannedProducts: EMPTY_DIFF,
  serviceItems: EMPTY_DIFF,
  commissions: EMPTY_DIFF,
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyTemplatePlannedProductsDiffMock.mockReset()
  applyTemplateServiceItemsDiffMock.mockReset()
  applyTemplateCommissionsDiffMock.mockReset()
  getProductByIdMock.mockReset()
  listTemplatePlannedProductsMock.mockReset()
  listTemplateServiceItemsMock.mockReset()
  listTemplateCommissionsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // The appliers now return only tempIdMap; the lists are enriched on the pool.
  applyTemplatePlannedProductsDiffMock.mockResolvedValue({ tempIdMap: {} })
  applyTemplateServiceItemsDiffMock.mockResolvedValue({ tempIdMap: {} })
  applyTemplateCommissionsDiffMock.mockResolvedValue({ tempIdMap: {} })
  listTemplatePlannedProductsMock.mockResolvedValue([])
  listTemplateServiceItemsMock.mockResolvedValue([])
  listTemplateCommissionsMock.mockResolvedValue([])
})

describe("saveTemplateProductsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveTemplateProductsSectionUseCase(EMPTY_INPUT as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyTemplatePlannedProductsDiffMock).not.toHaveBeenCalled()
    expect(applyTemplateServiceItemsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail to BOTH diff writers so items get stamped", async () => {
    await saveTemplateProductsSectionUseCase(EMPTY_INPUT as never, ACTOR)
    expect(applyTemplatePlannedProductsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateId: "tpl-1", actorEmail: ACTOR }),
    )
    expect(applyTemplateServiceItemsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateId: "tpl-1", actorEmail: ACTOR }),
    )
  })

  it("merges both tables' tempId maps and enriches both lists", async () => {
    applyTemplatePlannedProductsDiffMock.mockResolvedValue({ tempIdMap: { pp: "prod-row-1" } })
    applyTemplateServiceItemsDiffMock.mockResolvedValue({ tempIdMap: { si: "svc-row-1" } })
    const result = await saveTemplateProductsSectionUseCase(EMPTY_INPUT as never, ACTOR)
    expect(result.tempIdMap).toEqual({ pp: "prod-row-1", si: "svc-row-1" })
    expect(listTemplatePlannedProductsMock).toHaveBeenCalledWith("tpl-1", expect.anything())
    expect(listTemplateServiceItemsMock).toHaveBeenCalledWith("tpl-1", expect.anything())
  })

  it("passes a manual service-item cost straight through to the service writer", async () => {
    await saveTemplateProductsSectionUseCase(
      {
        templateId: "tpl-1",
        plannedProducts: EMPTY_DIFF,
        serviceItems: {
          added: [
            {
              tempId: "t1",
              form: {
                itemType: "LABOR",
                itemName: "Install",
                quantity: "2",
                unitId: "",
                cost: "10.00",
                taxed: true,
              },
            },
          ],
          modified: [],
          deleted: [],
        },
        commissions: EMPTY_DIFF,
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplateServiceItemsDiffMock.mock.calls[0]
    // Manual cost + taxed flag survive to the writer (no product join, no re-seed).
    expect(diff.added[0].input.cost).toBe("10.00")
    expect(diff.added[0].input.taxed).toBe(true)
  })

  it("keeps a cleared unit blank on a MODIFIED planned-product row (no re-seed)", async () => {
    getProductByIdMock.mockResolvedValue({ id: "prod-1", unitId: "prod-unit-1" })
    await saveTemplateProductsSectionUseCase(
      {
        templateId: "tpl-1",
        plannedProducts: {
          added: [],
          modified: [
            { id: "item-1", form: { productId: "prod-1", unitId: "", quantity: "5", notes: "" } },
          ],
          deleted: [],
        },
        serviceItems: EMPTY_DIFF,
        commissions: EMPTY_DIFF,
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplatePlannedProductsDiffMock.mock.calls[0]
    // The user's clear survives — NOT replaced by the product's own unit.
    expect(diff.modified[0].input.unitId).toBe("")
  })
})
