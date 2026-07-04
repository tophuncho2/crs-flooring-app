import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  applyWorkOrderMaterialItemsDiffMock,
  getProductByIdMock,
  listWorkOrderMaterialItemsMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyWorkOrderMaterialItemsDiffMock: vi.fn(),
    getProductByIdMock: vi.fn(),
    listWorkOrderMaterialItemsMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  applyWorkOrderMaterialItemsDiff: applyWorkOrderMaterialItemsDiffMock,
  getProductById: getProductByIdMock,
  listWorkOrderMaterialItems: listWorkOrderMaterialItemsMock,
}))

import { saveWorkOrderMaterialItemsSectionUseCase } from "../../../src/work-orders/material-items/save-work-order-material-items-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyWorkOrderMaterialItemsDiffMock.mockReset()
  getProductByIdMock.mockReset()
  listWorkOrderMaterialItemsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  applyWorkOrderMaterialItemsDiffMock.mockResolvedValue({ items: [], tempIdMap: {} })
  listWorkOrderMaterialItemsMock.mockResolvedValue([])
})

describe("saveWorkOrderMaterialItemsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveWorkOrderMaterialItemsSectionUseCase({ workOrderId: "wo-1", diff: EMPTY_DIFF } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyWorkOrderMaterialItemsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail to the diff writer so items get stamped", async () => {
    await saveWorkOrderMaterialItemsSectionUseCase(
      { workOrderId: "wo-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyWorkOrderMaterialItemsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ workOrderId: "wo-1", actorEmail: ACTOR }),
    )
  })

  it("does NOT re-seed the unit when a MODIFIED row's product changes (unit stays user-managed)", async () => {
    getProductByIdMock.mockResolvedValue({ id: "prod-new", unitId: "prod-new-unit" })
    listWorkOrderMaterialItemsMock.mockResolvedValue([{ id: "item-1", productId: "prod-old" }])

    await saveWorkOrderMaterialItemsSectionUseCase(
      {
        workOrderId: "wo-1",
        diff: {
          added: [],
          modified: [
            { id: "item-1", form: { productId: "prod-new", unitId: "", quantity: "5", notes: "" } },
          ],
          deleted: [],
        },
      } as never,
      ACTOR,
    )

    const [, diff] = applyWorkOrderMaterialItemsDiffMock.mock.calls[0]
    // A blank unit stays blank even though the product changed — the server
    // never swaps in the new product's unit (the client owns the seed).
    expect(diff.modified[0].input.unitId).toBe("")
    // The product FK is still reconnected on a genuine product change.
    expect(diff.modified[0].input.product).toEqual({ productId: "prod-new" })
  })
})
