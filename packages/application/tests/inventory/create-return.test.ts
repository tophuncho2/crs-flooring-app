import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getProductByIdMock,
  getWarehouseByIdMock,
  getUnitOfMeasureByIdMock,
  insertInventoryRowMock,
  getInventoryParentContextForAdjustmentsMock,
  insertAdjustmentRowMock,
  recomputeAndPersistNetDeductedMock,
  getInventoryByIdMock,
  getAdjustmentByIdMock,
  buildReturnInventoryInsertMock,
  validateCreateReturnEditsMock,
  describeReturnCreateIssuesMock,
  buildAdjustmentInventorySnapshotMock,
  assertNetDeductedWithinStartingStockMock,
  InventoryAdjustmentDomainErrorClass,
} = vi.hoisted(() => {
  class InventoryAdjustmentDomainError extends Error {
    code: string
    detail?: unknown
    constructor(code: string, detail?: unknown) {
      super(code)
      this.name = "InventoryAdjustmentDomainError"
      this.code = code
      this.detail = detail
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    getProductByIdMock: vi.fn(),
    getWarehouseByIdMock: vi.fn(),
    getUnitOfMeasureByIdMock: vi.fn(),
    insertInventoryRowMock: vi.fn(),
    getInventoryParentContextForAdjustmentsMock: vi.fn(),
    insertAdjustmentRowMock: vi.fn(),
    recomputeAndPersistNetDeductedMock: vi.fn(),
    getInventoryByIdMock: vi.fn(),
    getAdjustmentByIdMock: vi.fn(),
    buildReturnInventoryInsertMock: vi.fn(),
    validateCreateReturnEditsMock: vi.fn(),
    describeReturnCreateIssuesMock: vi.fn(),
    buildAdjustmentInventorySnapshotMock: vi.fn(),
    assertNetDeductedWithinStartingStockMock: vi.fn(),
    InventoryAdjustmentDomainErrorClass: InventoryAdjustmentDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getProductById: getProductByIdMock,
  getWarehouseById: getWarehouseByIdMock,
  getUnitOfMeasureById: getUnitOfMeasureByIdMock,
  insertInventoryRow: insertInventoryRowMock,
  getInventoryParentContextForAdjustments: getInventoryParentContextForAdjustmentsMock,
  insertAdjustmentRow: insertAdjustmentRowMock,
  recomputeAndPersistNetDeducted: recomputeAndPersistNetDeductedMock,
  // Full-record reads on the pool after the transaction commits.
  getInventoryById: getInventoryByIdMock,
  getAdjustmentById: getAdjustmentByIdMock,
}))

vi.mock("@builders/domain", () => ({
  InventoryAdjustmentDomainError: InventoryAdjustmentDomainErrorClass,
  buildReturnInventoryInsert: buildReturnInventoryInsertMock,
  validateCreateReturnEdits: validateCreateReturnEditsMock,
  describeReturnCreateIssues: describeReturnCreateIssuesMock,
  buildAdjustmentInventorySnapshot: buildAdjustmentInventorySnapshotMock,
  assertNetDeductedWithinStartingStock: assertNetDeductedWithinStartingStockMock,
}))

import { createReturnUseCase } from "../../src/inventory/create-return.js"
import { InventoryExecutionError } from "../../src/inventory/errors.js"

const ACTOR = "actor@example.com"
const NEW_INV_ID = "22222222-2222-4222-8222-222222222222"
const ADJ_ID = "40000000-0000-4000-8000-000000000004"

function input(overrides: Record<string, unknown> = {}) {
  return {
    productId: "p-1",
    unitId: "u-1",
    warehouseId: "wh-1",
    rollNumber: "R-2",
    dyeLot: "DYE-9",
    note: "n",
    location: "Bay 7",
    coverageUnitId: "",
    coveragePerUnit: "",
    conversionFormulaId: "",
    returnedQuantity: "12",
    area: "Zone A",
    ...overrides,
  }
}

const PRODUCT = { id: "p-1", name: "Carpet" }
const WAREHOUSE = { id: "wh-1", name: "Main" }
const UNIT = { id: "u-1", name: "Square Feet", abbreviation: "SF" }
const BUILT_FIELDS = { productId: "p-1", startingStock: "0", netDeducted: "0", isArchived: false }
const SNAPSHOT = { snapshot: true }
const CTX = {
  inventoryId: NEW_INV_ID,
  startingStock: "0",
  cost: null,
  freight: null,
  unitId: "u-1",
  unitName: "Square Feet",
  unitAbbrev: "SF",
  coverageUnitId: null,
  coveragePerUnit: null,
  conversionFormulaId: null,
  inventoryNumber: "INV-9",
  rollPrefix: "ROLL#",
  rollNumber: "R-2",
  dyeLot: "DYE-9",
  inventoryNote: "n",
  location: "Bay 7",
  productId: "p-1",
  warehouseId: "wh-1",
}
const INV_RECORD = { id: NEW_INV_ID, sentinel: "inventory" }
const ADJ_RECORD = { id: ADJ_ID, sentinel: "adjustment" }

let tx: Record<string, unknown>

beforeEach(() => {
  for (const m of [
    withDatabaseTransactionMock,
    getProductByIdMock,
    getWarehouseByIdMock,
    getUnitOfMeasureByIdMock,
    insertInventoryRowMock,
    getInventoryParentContextForAdjustmentsMock,
    insertAdjustmentRowMock,
    recomputeAndPersistNetDeductedMock,
    getInventoryByIdMock,
    getAdjustmentByIdMock,
    buildReturnInventoryInsertMock,
    validateCreateReturnEditsMock,
    describeReturnCreateIssuesMock,
    buildAdjustmentInventorySnapshotMock,
    assertNetDeductedWithinStartingStockMock,
  ]) {
    m.mockReset()
  }

  tx = { tx: true }
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx))
  validateCreateReturnEditsMock.mockReturnValue([])
  describeReturnCreateIssuesMock.mockReturnValue("bad return")
  getProductByIdMock.mockResolvedValue(PRODUCT)
  getWarehouseByIdMock.mockResolvedValue(WAREHOUSE)
  getUnitOfMeasureByIdMock.mockResolvedValue(UNIT)
  buildReturnInventoryInsertMock.mockReturnValue(BUILT_FIELDS)
  insertInventoryRowMock.mockResolvedValue({ id: NEW_INV_ID })
  getInventoryParentContextForAdjustmentsMock.mockResolvedValue(CTX)
  buildAdjustmentInventorySnapshotMock.mockReturnValue(SNAPSHOT)
  insertAdjustmentRowMock.mockResolvedValue({ id: ADJ_ID })
  // A fresh "0"-start row with a single INCREASE lands netDeducted NEGATIVE.
  recomputeAndPersistNetDeductedMock.mockResolvedValue([
    { inventoryId: NEW_INV_ID, netDeducted: "-12.00" },
  ])
  assertNetDeductedWithinStartingStockMock.mockReturnValue(undefined)
  getInventoryByIdMock.mockResolvedValue(INV_RECORD)
  getAdjustmentByIdMock.mockResolvedValue(ADJ_RECORD)
})

describe("createReturnUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(createReturnUseCase(input(), "   ")).rejects.toThrowError(/actorEmail/)
    expect(getProductByIdMock).not.toHaveBeenCalled()
    expect(insertInventoryRowMock).not.toHaveBeenCalled()
  })

  describe("happy path", () => {
    it("creates the new row + one INCREASE adjustment atomically, returns both enriched records", async () => {
      const result = await createReturnUseCase(input(), ACTOR)

      expect(result).toEqual({ inventory: INV_RECORD, adjustment: ADJ_RECORD })

      // Existence guards read on the pool — bare ids.
      expect(getProductByIdMock).toHaveBeenCalledWith("p-1")
      expect(getWarehouseByIdMock).toHaveBeenCalledWith("wh-1")

      // The new inventory row: built by the domain (startingStock "0" etc.),
      // stamped with createdAt + actor.
      expect(buildReturnInventoryInsertMock).toHaveBeenCalledWith(input())
      const invArg = insertInventoryRowMock.mock.calls[0]![1] as Record<string, unknown>
      expect(invArg).toMatchObject(BUILT_FIELDS)
      expect(invArg.createdAt).toBeInstanceOf(Date)
      expect(invArg.createdBy).toBe(ACTOR)
      expect(invArg.updatedBy).toBe(ACTOR)

      // The lone INCREASE adjustment on the just-created row: cost/freight null,
      // internalNotes "", quantity = the returned amount, location/area passed
      // straight through, unit + snapshot derived from the parent context.
      expect(insertAdjustmentRowMock).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          adjustmentType: "INCREASE",
          inventoryId: NEW_INV_ID,
          workOrderId: null,
          quantity: "12",
          isWaste: false,
          internalNotes: "",
          cost: null,
          freight: null,
          unitSnapshot: { unitId: "u-1" },
          inventorySnapshot: SNAPSHOT,
          location: "Bay 7",
          area: "Zone A",
          createdBy: ACTOR,
          updatedBy: ACTOR,
        }),
      )

      // Enriched on the pool after commit.
      expect(getInventoryByIdMock).toHaveBeenCalledWith(NEW_INV_ID)
      expect(getAdjustmentByIdMock).toHaveBeenCalledWith(ADJ_ID)
    })

    it("inserts the row, then reads its context, then inserts the adjustment, then recomputes", async () => {
      await createReturnUseCase(input(), ACTOR)

      const invOrder = insertInventoryRowMock.mock.invocationCallOrder[0]!
      const ctxOrder = getInventoryParentContextForAdjustmentsMock.mock.invocationCallOrder[0]!
      const adjOrder = insertAdjustmentRowMock.mock.invocationCallOrder[0]!
      const recomputeOrder = recomputeAndPersistNetDeductedMock.mock.invocationCallOrder[0]!
      expect(invOrder).toBeLessThan(ctxOrder)
      expect(ctxOrder).toBeLessThan(adjOrder)
      expect(adjOrder).toBeLessThan(recomputeOrder)
    })

    it("lands netDeducted negative and asserts the ceiling against a '0' starting stock", async () => {
      await createReturnUseCase(input(), ACTOR)

      expect(recomputeAndPersistNetDeductedMock).toHaveBeenCalledWith(tx, [NEW_INV_ID])
      expect(assertNetDeductedWithinStartingStockMock).toHaveBeenCalledWith({
        netDeducted: "-12.00",
        startingStock: "0",
      })
    })

    it("forwards an optional work-order link + isWaste onto the adjustment", async () => {
      await createReturnUseCase(input({ workOrderId: "wo-1", isWaste: true }), ACTOR)
      expect(insertAdjustmentRowMock).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ workOrderId: "wo-1", isWaste: true }),
      )
    })
  })

  describe("guards + atomicity", () => {
    it("throws INVENTORY_VALIDATION_FAILED (422) and inserts nothing on invalid edits", async () => {
      validateCreateReturnEditsMock.mockReturnValue([{ code: "RETURNED_QUANTITY_NOT_POSITIVE" }])

      await expect(createReturnUseCase(input({ returnedQuantity: "0" }), ACTOR)).rejects.toMatchObject(
        { code: "INVENTORY_VALIDATION_FAILED", status: 422 },
      )
      expect(getProductByIdMock).not.toHaveBeenCalled()
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
      expect(insertAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_PRODUCT_NOT_FOUND (404) when the product is missing", async () => {
      getProductByIdMock.mockResolvedValue(null)
      await expect(createReturnUseCase(input(), ACTOR)).rejects.toMatchObject({
        code: "INVENTORY_PRODUCT_NOT_FOUND",
        status: 404,
      })
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_WAREHOUSE_NOT_FOUND (404) when the warehouse is missing", async () => {
      getWarehouseByIdMock.mockResolvedValue(null)
      await expect(createReturnUseCase(input(), ACTOR)).rejects.toMatchObject({
        code: "INVENTORY_WAREHOUSE_NOT_FOUND",
        status: 404,
      })
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })

    it("a failed adjustment insert rolls the whole transaction back — no orphan enrich runs", async () => {
      insertAdjustmentRowMock.mockRejectedValue(new Error("insert blew up"))

      await expect(createReturnUseCase(input(), ACTOR)).rejects.toThrow("insert blew up")

      // The inventory insert happened inside the tx, but the throw aborts the tx
      // (real $transaction rolls it back). The post-commit enrichment reads must
      // never run — so no orphan row is surfaced to the caller.
      expect(getInventoryByIdMock).not.toHaveBeenCalled()
      expect(getAdjustmentByIdMock).not.toHaveBeenCalled()
    })
  })
})
