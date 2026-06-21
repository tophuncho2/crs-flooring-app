import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryForAdjustmentMock,
  getInventoryParentContextForAdjustmentsMock,
  insertPendingAdjustmentRowMock,
  getAdjustmentByIdMock,
  recomputeAndPersistNetDeductedMock,
  validateAdjustmentPendingFormMock,
  describeAdjustmentPendingFormIssuesMock,
  assertAdjustmentWarehouseMatchesInventoryMock,
  buildPendingAdjustmentInventorySnapshotMock,
  assertNetDeductedWithinStartingStockMock,
  computeAdjustmentMoneyShareMock,
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
    lockInventoryForAdjustmentMock: vi.fn(),
    getInventoryParentContextForAdjustmentsMock: vi.fn(),
    insertPendingAdjustmentRowMock: vi.fn(),
    getAdjustmentByIdMock: vi.fn(),
    recomputeAndPersistNetDeductedMock: vi.fn(),
    validateAdjustmentPendingFormMock: vi.fn(),
    describeAdjustmentPendingFormIssuesMock: vi.fn(),
    assertAdjustmentWarehouseMatchesInventoryMock: vi.fn(),
    buildPendingAdjustmentInventorySnapshotMock: vi.fn(),
    assertNetDeductedWithinStartingStockMock: vi.fn(),
    computeAdjustmentMoneyShareMock: vi.fn(),
    InventoryAdjustmentDomainErrorClass: InventoryAdjustmentDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryForAdjustment: lockInventoryForAdjustmentMock,
  getInventoryParentContextForAdjustments: getInventoryParentContextForAdjustmentsMock,
  insertPendingAdjustmentRow: insertPendingAdjustmentRowMock,
  getAdjustmentById: getAdjustmentByIdMock,
  recomputeAndPersistNetDeducted: recomputeAndPersistNetDeductedMock,
}))

vi.mock("@builders/domain", () => ({
  InventoryAdjustmentDomainError: InventoryAdjustmentDomainErrorClass,
  validateAdjustmentPendingForm: validateAdjustmentPendingFormMock,
  describeAdjustmentPendingFormIssues: describeAdjustmentPendingFormIssuesMock,
  assertAdjustmentWarehouseMatchesInventory: assertAdjustmentWarehouseMatchesInventoryMock,
  buildPendingAdjustmentInventorySnapshot: buildPendingAdjustmentInventorySnapshotMock,
  assertNetDeductedWithinStartingStock: assertNetDeductedWithinStartingStockMock,
  computeAdjustmentMoneyShare: computeAdjustmentMoneyShareMock,
}))

import { createPendingAdjustmentUseCase } from "../../../../src/flooring/inventory/adjustments/create-pending-adjustment.js"
import { InventoryAdjustmentExecutionError } from "../../../../src/flooring/inventory/adjustments/errors.js"

const WO_ID = "10000000-0000-4000-8000-000000000001"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const ADJUSTMENT_ID = "40000000-0000-4000-8000-000000000004"

// A WO-linked DEDUCTION create (the shape the work-orders record view sends).
// Adjustments link to a work order (any product) — no material-item link.
function cutVariantInput(overrides: Record<string, unknown> = {}) {
  return {
    adjustmentType: "DEDUCTION" as const,
    workOrderId: WO_ID,
    inventoryId: INVENTORY_ID,
    quantity: "5",
    isWaste: false,
    notes: "",
    location: "Bay 7",
    ...overrides,
  }
}

// A plain inventory create with no WO link (the inventory-hub shape).
function manualVariantInput(overrides: Record<string, unknown> = {}) {
  return {
    adjustmentType: "INCREASE" as const,
    inventoryId: INVENTORY_ID,
    quantity: "10",
    isWaste: false,
    notes: "",
    ...overrides,
  }
}

function inventoryContext(overrides: Record<string, unknown> = {}) {
  return {
    startingStock: "100.00",
    cost: "200.00",
    freight: "50.00",
    categorySlug: "vinyl-plank",
    stockUnitName: "Square Foot",
    stockUnitAbbrev: "sf",
    inventoryItem: "INV-5 · ROLL#R-1",
    inventoryNumber: "INV-5",
    rollPrefix: "ROLL#",
    rollNumber: "R-1",
    dyeLot: "D-1",
    inventoryNote: "note",
    productId: "prod-1",
    warehouseId: "wh-1",
    location: "A1",
    ...overrides,
  }
}

const INSERTED = { id: ADJUSTMENT_ID, quantity: "5.00" }
const SNAPSHOT = { inventoryItem: "INV-5 · ROLL#R-1", snapshot: true }

let tx: Record<string, unknown>

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryForAdjustmentMock.mockReset()
  getInventoryParentContextForAdjustmentsMock.mockReset()
  insertPendingAdjustmentRowMock.mockReset()
  getAdjustmentByIdMock.mockReset()
  recomputeAndPersistNetDeductedMock.mockReset()
  validateAdjustmentPendingFormMock.mockReset()
  describeAdjustmentPendingFormIssuesMock.mockReset()
  assertAdjustmentWarehouseMatchesInventoryMock.mockReset()
  buildPendingAdjustmentInventorySnapshotMock.mockReset()
  assertNetDeductedWithinStartingStockMock.mockReset()
  computeAdjustmentMoneyShareMock.mockReset()
  // Faithful stand-in for the pure domain helper: total × qty / startingStock,
  // null when the total is absent or the divisor is zero.
  computeAdjustmentMoneyShareMock.mockImplementation(
    (total: string | null, startingStock: string, quantity: string) => {
      if (total == null || total.trim() === "") return null
      const divisor = Number(startingStock)
      if (!Number.isFinite(divisor) || divisor === 0) return null
      const share = (Number(total) * Number(quantity)) / divisor
      return Number.isFinite(share) ? share.toFixed(2) : null
    },
  )

  tx = {}
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx))

  validateAdjustmentPendingFormMock.mockReturnValue([])
  describeAdjustmentPendingFormIssuesMock.mockReturnValue("form issue")
  assertAdjustmentWarehouseMatchesInventoryMock.mockReturnValue(undefined)
  getInventoryParentContextForAdjustmentsMock.mockResolvedValue(inventoryContext())
  buildPendingAdjustmentInventorySnapshotMock.mockReturnValue(SNAPSHOT)
  insertPendingAdjustmentRowMock.mockResolvedValue(INSERTED)
  getAdjustmentByIdMock.mockResolvedValue(INSERTED)
  recomputeAndPersistNetDeductedMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, netDeducted: "5.00" },
  ])
  assertNetDeductedWithinStartingStockMock.mockReturnValue(undefined)
})

describe("createPendingAdjustmentUseCase — WO-linked create", () => {
  describe("happy path", () => {
    it("inserts a DEDUCTION with the WO link + snapshot, recomputes netDeducted, returns the result", async () => {
      const result = await createPendingAdjustmentUseCase(cutVariantInput())

      expect(result).toEqual({
        adjustment: INSERTED,
        inventoryId: INVENTORY_ID,
        netDeducted: "5.00",
      })
      expect(insertPendingAdjustmentRowMock).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          adjustmentType: "DEDUCTION",
          workOrderId: WO_ID,
          inventoryId: INVENTORY_ID,
          quantity: "5",
          isWaste: false,
          inventorySnapshot: SNAPSHOT,
          // Derived unsigned money share: cost 200 × 5 / 100 = 10.00, freight 50 × 5 / 100 = 2.50.
          cost: "10.00",
          freight: "2.50",
          // User-owned: comes from the input ("Bay 7"), not the parent inventory ("A1").
          location: "Bay 7",
          unitSnapshot: {
            stockUnitName: "Square Foot",
            stockUnitAbbrev: "sf",
          },
        }),
      )
      expect(recomputeAndPersistNetDeductedMock).toHaveBeenCalledWith(tx, [INVENTORY_ID])
    })

    it("does NOT validate the WO link against the inventory's product (any product may link)", async () => {
      await createPendingAdjustmentUseCase(cutVariantInput())
      // No material-item fetch / product-match guard exists anymore.
      expect(insertPendingAdjustmentRowMock).toHaveBeenCalled()
    })

    it("locks the parent inventory before reading its context", async () => {
      await createPendingAdjustmentUseCase(cutVariantInput())

      const lockOrder = lockInventoryForAdjustmentMock.mock.invocationCallOrder[0]!
      const contextOrder = getInventoryParentContextForAdjustmentsMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(contextOrder)
    })

    it("inserts before recomputing", async () => {
      await createPendingAdjustmentUseCase(cutVariantInput())

      const insertOrder = insertPendingAdjustmentRowMock.mock.invocationCallOrder[0]!
      const recomputeOrder = recomputeAndPersistNetDeductedMock.mock.invocationCallOrder[0]!
      expect(insertOrder).toBeLessThan(recomputeOrder)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_ADJUSTMENT_VALIDATION_FAILED (400) when the form is invalid", async () => {
      validateAdjustmentPendingFormMock.mockReturnValue([{ code: "ADJUSTMENT_QUANTITY_REQUIRED" }])

      await expect(createPendingAdjustmentUseCase(cutVariantInput())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
        status: 400,
      })
      expect(insertPendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) when the parent inventory is missing", async () => {
      getInventoryParentContextForAdjustmentsMock.mockResolvedValue(null)

      await expect(createPendingAdjustmentUseCase(cutVariantInput())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        status: 404,
      })
      expect(insertPendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("translates the netDeducted ceiling breach into INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY (400)", async () => {
      assertNetDeductedWithinStartingStockMock.mockImplementation(() => {
        throw new InventoryAdjustmentDomainErrorClass(
          "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
          {},
        )
      })

      try {
        await createPendingAdjustmentUseCase(cutVariantInput())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryAdjustmentExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY")
        expect(error.status).toBe(400)
        expect(error.payload).toMatchObject({ inventoryId: INVENTORY_ID, netDeducted: "5.00" })
      }
    })
  })
})

describe("createPendingAdjustmentUseCase — inventory create", () => {
  it("inserts a manual INCREASE with no WO link and isWaste=false", async () => {
    insertPendingAdjustmentRowMock.mockResolvedValue({ id: ADJUSTMENT_ID, quantity: "10.00" })
    recomputeAndPersistNetDeductedMock.mockResolvedValue([
      { inventoryId: INVENTORY_ID, netDeducted: "-10.00" },
    ])

    const result = await createPendingAdjustmentUseCase(manualVariantInput())

    expect(result.netDeducted).toBe("-10.00")
    expect(insertPendingAdjustmentRowMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        adjustmentType: "INCREASE",
        workOrderId: null,
        isWaste: false,
        quantity: "10",
      }),
    )
  })

  it("inserts a manual INCREASE flagged as waste (isWaste honored on either direction)", async () => {
    insertPendingAdjustmentRowMock.mockResolvedValue({ id: ADJUSTMENT_ID, quantity: "10.00" })
    recomputeAndPersistNetDeductedMock.mockResolvedValue([
      { inventoryId: INVENTORY_ID, netDeducted: "-10.00" },
    ])

    await createPendingAdjustmentUseCase(manualVariantInput({ isWaste: true }))

    expect(insertPendingAdjustmentRowMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        adjustmentType: "INCREASE",
        workOrderId: null,
        isWaste: true,
      }),
    )
  })

  it("inserts a WO-linked manual INCREASE (return-to-stock against a work order)", async () => {
    await createPendingAdjustmentUseCase(
      manualVariantInput({ adjustmentType: "INCREASE", workOrderId: WO_ID }),
    )
    expect(insertPendingAdjustmentRowMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        adjustmentType: "INCREASE",
        workOrderId: WO_ID,
      }),
    )
  })

  it("asserts the warehouse invariant when the form passes a selected warehouse", async () => {
    await createPendingAdjustmentUseCase(manualVariantInput({ warehouseId: "wh-1" }))
    expect(assertAdjustmentWarehouseMatchesInventoryMock).toHaveBeenCalledWith({
      adjustmentWarehouseId: "wh-1",
      inventoryWarehouseId: "wh-1",
    })
  })

  it("throws INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH (400) when the selected warehouse differs", async () => {
    assertAdjustmentWarehouseMatchesInventoryMock.mockImplementation(() => {
      throw new InventoryAdjustmentDomainErrorClass(
        "INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH",
        {},
      )
    })

    await expect(
      createPendingAdjustmentUseCase(manualVariantInput({ warehouseId: "wh-other" })),
    ).rejects.toMatchObject({
      code: "INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH",
      status: 400,
    })
    expect(insertPendingAdjustmentRowMock).not.toHaveBeenCalled()
  })
})
