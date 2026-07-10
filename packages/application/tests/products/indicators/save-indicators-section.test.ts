import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getIndicatorByIdMock,
  lockIndicatorRowMock,
  updateIndicatorRecordMock,
  deleteIndicatorRecordByIdMock,
  listIndicatorsForProductMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    getIndicatorByIdMock: vi.fn(),
    lockIndicatorRowMock: vi.fn(),
    updateIndicatorRecordMock: vi.fn(),
    deleteIndicatorRecordByIdMock: vi.fn(),
    listIndicatorsForProductMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getIndicatorById: getIndicatorByIdMock,
  lockIndicatorRow: lockIndicatorRowMock,
  updateIndicatorRecord: updateIndicatorRecordMock,
  deleteIndicatorRecordById: deleteIndicatorRecordByIdMock,
  listIndicatorsForProduct: listIndicatorsForProductMock,
}))

import { saveIndicatorsSectionUseCase } from "../../../src/products/indicators/save-indicators-section.js"

const ACTOR = "actor@example.com"
const PRODUCT = "prod-1"
const EMPTY_DIFF = { modified: [], deleted: [] }
const VALID_FORM = { lowStockThreshold: "10.00", internalNotes: "note", isActive: true }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getIndicatorByIdMock.mockReset()
  lockIndicatorRowMock.mockReset()
  updateIndicatorRecordMock.mockReset()
  deleteIndicatorRecordByIdMock.mockReset()
  listIndicatorsForProductMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  listIndicatorsForProductMock.mockResolvedValue({ rows: [], hasMore: false })
})

describe("saveIndicatorsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveIndicatorsSectionUseCase({ productId: PRODUCT, diff: EMPTY_DIFF }, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(getIndicatorByIdMock).not.toHaveBeenCalled()
  })

  it("applies a modified row's editable subset, stamping the actor as updatedBy", async () => {
    getIndicatorByIdMock.mockResolvedValue({ id: "ind-1", productId: PRODUCT })
    listIndicatorsForProductMock.mockResolvedValue({ rows: [{ id: "ind-1" }], hasMore: false })

    const result = await saveIndicatorsSectionUseCase(
      { productId: PRODUCT, diff: { modified: [{ id: "ind-1", form: VALID_FORM }], deleted: [] } },
      ACTOR,
    )

    expect(lockIndicatorRowMock).toHaveBeenCalledWith(expect.anything(), "ind-1")
    const [, updateInput] = updateIndicatorRecordMock.mock.calls[0]
    expect(updateInput.id).toBe("ind-1")
    expect(updateInput.patch.updatedBy).toBe(ACTOR)
    expect(updateInput.patch.isActive).toBe(true)
    expect(updateInput.patch.lowStockThreshold).toBe("10.00")
    expect(result.rows).toEqual([{ id: "ind-1" }])
  })

  it("deletes a removed row and never updates it", async () => {
    getIndicatorByIdMock.mockResolvedValue({ id: "ind-2", productId: PRODUCT })

    await saveIndicatorsSectionUseCase(
      { productId: PRODUCT, diff: { modified: [], deleted: [{ id: "ind-2" }] } },
      ACTOR,
    )

    expect(deleteIndicatorRecordByIdMock).toHaveBeenCalledWith(expect.anything(), { id: "ind-2" })
    expect(updateIndicatorRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a modified row that belongs to another product (scope guard)", async () => {
    getIndicatorByIdMock.mockResolvedValue({ id: "ind-9", productId: "other-product" })

    await expect(
      saveIndicatorsSectionUseCase(
        { productId: PRODUCT, diff: { modified: [{ id: "ind-9", form: VALID_FORM }], deleted: [] } },
        ACTOR,
      ),
    ).rejects.toThrowError(/does not belong to this product/)
    expect(updateIndicatorRecordMock).not.toHaveBeenCalled()
  })
})
