import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryForAdjustmentMock,
  getInventoryParentContextForAdjustmentsMock,
  insertPendingAdjustmentRowMock,
  recomputeAndPersistNetDeductedMock,
  validateAdjustmentPendingFormMock,
  describeAdjustmentPendingFormIssuesMock,
  assertAdjustmentLinkageRulesMock,
  deriveAdjustmentCoverageStringMock,
  buildPendingAdjustmentInventorySnapshotMock,
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
    lockInventoryForAdjustmentMock: vi.fn(),
    getInventoryParentContextForAdjustmentsMock: vi.fn(),
    insertPendingAdjustmentRowMock: vi.fn(),
    recomputeAndPersistNetDeductedMock: vi.fn(),
    validateAdjustmentPendingFormMock: vi.fn(),
    describeAdjustmentPendingFormIssuesMock: vi.fn(),
    assertAdjustmentLinkageRulesMock: vi.fn(),
    deriveAdjustmentCoverageStringMock: vi.fn(),
    buildPendingAdjustmentInventorySnapshotMock: vi.fn(),
    assertNetDeductedWithinStartingStockMock: vi.fn(),
    InventoryAdjustmentDomainErrorClass: InventoryAdjustmentDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryForAdjustment: lockInventoryForAdjustmentMock,
  getInventoryParentContextForAdjustments: getInventoryParentContextForAdjustmentsMock,
  insertPendingAdjustmentRow: insertPendingAdjustmentRowMock,
  recomputeAndPersistNetDeducted: recomputeAndPersistNetDeductedMock,
}))

vi.mock("@builders/domain", () => ({
  InventoryAdjustmentDomainError: InventoryAdjustmentDomainErrorClass,
  validateAdjustmentPendingForm: validateAdjustmentPendingFormMock,
  describeAdjustmentPendingFormIssues: describeAdjustmentPendingFormIssuesMock,
  assertAdjustmentLinkageRules: assertAdjustmentLinkageRulesMock,
  deriveAdjustmentCoverageString: deriveAdjustmentCoverageStringMock,
  buildPendingAdjustmentInventorySnapshot: buildPendingAdjustmentInventorySnapshotMock,
  assertNetDeductedWithinStartingStock: assertNetDeductedWithinStartingStockMock,
}))

import { createPendingAdjustmentUseCase } from "../../../../src/flooring/inventory/adjustments/create-pending-adjustment.js"
import { InventoryAdjustmentExecutionError } from "../../../../src/flooring/inventory/adjustments/errors.js"

const WO_ID = "10000000-0000-4000-8000-000000000001"
const WOMI_ID = "20000000-0000-4000-8000-000000000002"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const ADJUSTMENT_ID = "40000000-0000-4000-8000-000000000004"

function cutVariantInput(overrides: Record<string, unknown> = {}) {
  return {
    variant: "cut" as const,
    workOrderId: WO_ID,
    workOrderItemId: WOMI_ID,
    inventoryId: INVENTORY_ID,
    quantity: "5",
    isWaste: false,
    notes: "",
    ...overrides,
  }
}

function manualVariantInput(overrides: Record<string, unknown> = {}) {
  return {
    variant: "manual" as const,
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
    categorySlug: "vinyl-plank",
    coveragePerUnit: "2.50",
    stockUnitName: "Square Foot",
    stockUnitAbbrev: "sf",
    itemCoverageUnitName: "Box",
    itemCoverageUnitAbbrev: "bx",
    inventoryItem: "INV-5 · ROLL#R-1",
    inventoryNumber: "INV-5",
    rollPrefix: "ROLL#",
    rollNumber: "R-1",
    dyeLot: "D-1",
    inventoryNote: "note",
    productId: "prod-1",
    productName: "Plank A",
    warehouseId: "wh-1",
    location: "A1",
    ...overrides,
  }
}

const INSERTED = { id: ADJUSTMENT_ID, quantity: "5.00" }
const SNAPSHOT = { inventoryItem: "INV-5 · ROLL#R-1", snapshot: true }

let tx: { flooringWorkOrderItem: { findUnique: ReturnType<typeof vi.fn> } }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryForAdjustmentMock.mockReset()
  getInventoryParentContextForAdjustmentsMock.mockReset()
  insertPendingAdjustmentRowMock.mockReset()
  recomputeAndPersistNetDeductedMock.mockReset()
  validateAdjustmentPendingFormMock.mockReset()
  describeAdjustmentPendingFormIssuesMock.mockReset()
  assertAdjustmentLinkageRulesMock.mockReset()
  deriveAdjustmentCoverageStringMock.mockReset()
  buildPendingAdjustmentInventorySnapshotMock.mockReset()
  assertNetDeductedWithinStartingStockMock.mockReset()

  tx = { flooringWorkOrderItem: { findUnique: vi.fn() } }
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx))

  tx.flooringWorkOrderItem.findUnique.mockResolvedValue({ id: WOMI_ID, workOrderId: WO_ID })
  validateAdjustmentPendingFormMock.mockReturnValue([])
  describeAdjustmentPendingFormIssuesMock.mockReturnValue("form issue")
  assertAdjustmentLinkageRulesMock.mockReturnValue(undefined)
  getInventoryParentContextForAdjustmentsMock.mockResolvedValue(inventoryContext())
  deriveAdjustmentCoverageStringMock.mockReturnValue("12.50")
  buildPendingAdjustmentInventorySnapshotMock.mockReturnValue(SNAPSHOT)
  insertPendingAdjustmentRowMock.mockResolvedValue(INSERTED)
  recomputeAndPersistNetDeductedMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, netDeducted: "5.00" },
  ])
  assertNetDeductedWithinStartingStockMock.mockReturnValue(undefined)
})

describe("createPendingAdjustmentUseCase — variant: cut", () => {
  describe("happy path", () => {
    it("inserts a DEDUCTION with derived coverage + snapshot, recomputes netDeducted, returns the result", async () => {
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
          workOrderItemId: WOMI_ID,
          inventoryId: INVENTORY_ID,
          quantity: "5",
          coverage: "12.50",
          isWaste: false,
          inventorySnapshot: SNAPSHOT,
          location: "A1",
          unitSnapshot: {
            stockUnitName: "Square Foot",
            stockUnitAbbrev: "sf",
            itemCoverageUnitName: "Box",
            itemCoverageUnitAbbrev: "bx",
          },
        }),
      )
      expect(recomputeAndPersistNetDeductedMock).toHaveBeenCalledWith(tx, [INVENTORY_ID])
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
    it("throws INVENTORY_ADJUSTMENT_VALIDATION_FAILED (400) and never touches the WOMI when the form is invalid", async () => {
      validateAdjustmentPendingFormMock.mockReturnValue([{ code: "ADJUSTMENT_QUANTITY_REQUIRED" }])

      await expect(createPendingAdjustmentUseCase(cutVariantInput())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
        status: 400,
      })
      expect(tx.flooringWorkOrderItem.findUnique).not.toHaveBeenCalled()
      expect(insertPendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) when the WOMI does not exist", async () => {
      tx.flooringWorkOrderItem.findUnique.mockResolvedValue(null)

      await expect(createPendingAdjustmentUseCase(cutVariantInput())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        status: 404,
      })
      expect(insertPendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_SCOPE_MISMATCH (400) when the WOMI belongs to another work order", async () => {
      tx.flooringWorkOrderItem.findUnique.mockResolvedValue({
        id: WOMI_ID,
        workOrderId: "different-wo",
      })

      await expect(createPendingAdjustmentUseCase(cutVariantInput())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH",
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

describe("createPendingAdjustmentUseCase — variant: manual", () => {
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
        workOrderItemId: null,
        isWaste: false,
        quantity: "10",
      }),
    )
    expect(tx.flooringWorkOrderItem.findUnique).not.toHaveBeenCalled()
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
        workOrderItemId: null,
        isWaste: true,
      }),
    )
  })

  it("inserts a manual DEDUCTION (recount-down) with no WO link", async () => {
    await createPendingAdjustmentUseCase(
      manualVariantInput({ adjustmentType: "DEDUCTION", quantity: "3" }),
    )
    expect(insertPendingAdjustmentRowMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        adjustmentType: "DEDUCTION",
        workOrderId: null,
        workOrderItemId: null,
      }),
    )
  })

  it("rejects an INCREASE with a WO link via assertAdjustmentLinkageRules", async () => {
    // The variant: "cut" payload always implies DEDUCTION + WO-linked, so the
    // ill-formed shape comes via the domain rule mock; simulate the throw.
    assertAdjustmentLinkageRulesMock.mockImplementation(() => {
      throw new InventoryAdjustmentDomainErrorClass(
        "INVENTORY_ADJUSTMENT_INCREASE_REQUIRES_NO_WORK_ORDER",
        {},
      )
    })

    await expect(createPendingAdjustmentUseCase(manualVariantInput())).rejects.toMatchObject({
      code: "INVENTORY_ADJUSTMENT_INCREASE_REQUIRES_NO_WORK_ORDER",
      status: 400,
    })
    expect(insertPendingAdjustmentRowMock).not.toHaveBeenCalled()
  })
})
