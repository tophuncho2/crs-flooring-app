import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  dbWomiFindUniqueMock,
  getPendingAdjustmentWithInventoryForMutationMock,
  getAdjustmentByIdMock,
  lockInventoryForAdjustmentMock,
  updatePendingAdjustmentRowMock,
  recomputeAndPersistNetDeductedMock,
  assertAdjustmentExpectedUpdatedAtMatchesMock,
  assertAdjustmentLinkMutationAllowedMock,
  assertAdjustmentLinkageRulesMock,
  assertAdjustmentMetaMutationAllowedMock,
  assertAdjustmentPendingMutationAllowedMock,
  assertNetDeductedWithinStartingStockMock,
  describeAdjustmentPendingFormIssuesMock,
  validateAdjustmentPendingFormMock,
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
    dbWomiFindUniqueMock: vi.fn(),
    getPendingAdjustmentWithInventoryForMutationMock: vi.fn(),
    getAdjustmentByIdMock: vi.fn(),
    lockInventoryForAdjustmentMock: vi.fn(),
    updatePendingAdjustmentRowMock: vi.fn(),
    recomputeAndPersistNetDeductedMock: vi.fn(),
    assertAdjustmentExpectedUpdatedAtMatchesMock: vi.fn(),
    assertAdjustmentLinkMutationAllowedMock: vi.fn(),
    assertAdjustmentLinkageRulesMock: vi.fn(),
    assertAdjustmentMetaMutationAllowedMock: vi.fn(),
    assertAdjustmentPendingMutationAllowedMock: vi.fn(),
    assertNetDeductedWithinStartingStockMock: vi.fn(),
    describeAdjustmentPendingFormIssuesMock: vi.fn(),
    validateAdjustmentPendingFormMock: vi.fn(),
    InventoryAdjustmentDomainErrorClass: InventoryAdjustmentDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  db: { flooringWorkOrderItem: { findUnique: dbWomiFindUniqueMock } },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getPendingAdjustmentWithInventoryForMutation: getPendingAdjustmentWithInventoryForMutationMock,
  getAdjustmentById: getAdjustmentByIdMock,
  lockInventoryForAdjustment: lockInventoryForAdjustmentMock,
  updatePendingAdjustmentRow: updatePendingAdjustmentRowMock,
  recomputeAndPersistNetDeducted: recomputeAndPersistNetDeductedMock,
}))

vi.mock("@builders/domain", () => ({
  InventoryAdjustmentDomainError: InventoryAdjustmentDomainErrorClass,
  assertAdjustmentExpectedUpdatedAtMatches: assertAdjustmentExpectedUpdatedAtMatchesMock,
  assertAdjustmentLinkMutationAllowed: assertAdjustmentLinkMutationAllowedMock,
  assertAdjustmentLinkageRules: assertAdjustmentLinkageRulesMock,
  assertAdjustmentMetaMutationAllowed: assertAdjustmentMetaMutationAllowedMock,
  assertAdjustmentPendingMutationAllowed: assertAdjustmentPendingMutationAllowedMock,
  assertNetDeductedWithinStartingStock: assertNetDeductedWithinStartingStockMock,
  describeAdjustmentPendingFormIssues: describeAdjustmentPendingFormIssuesMock,
  validateAdjustmentPendingForm: validateAdjustmentPendingFormMock,
}))

import { updatePendingAdjustmentUseCase } from "../../../../src/flooring/inventory/adjustments/update-pending-adjustment.js"
import { InventoryAdjustmentExecutionError } from "../../../../src/flooring/inventory/adjustments/errors.js"

const WO_ID = "10000000-0000-4000-8000-000000000001"
const ADJUSTMENT_ID = "40000000-0000-4000-8000-000000000004"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const WAREHOUSE_ID = "wh-1"
const PRODUCT_ID = "prod-1"
const NEW_WO = "10000000-0000-4000-8000-00000000000a"
const NEW_WOMI = "20000000-0000-4000-8000-00000000000b"
const UPDATED_AT = "2026-01-01T00:00:00.000Z"

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ADJUSTMENT_ID,
    workOrderId: WO_ID,
    inventoryId: INVENTORY_ID,
    status: "PENDING",
    isFinal: false,
    adjustmentType: "DEDUCTION",
    updatedAt: UPDATED_AT,
    quantity: "5",
    isWaste: false,
    notes: "",
    warehouseId: WAREHOUSE_ID,
    productId: PRODUCT_ID,
    ...overrides,
  }
}

function inventoryRow(overrides: Record<string, unknown> = {}) {
  return {
    categorySlug: "vinyl-plank",
    location: "A1",
    startingStock: "100.00",
    currentNetDeducted: "5.00",
    stockUnitAbbrev: "sf",
    ...overrides,
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    scope: { kind: "work-order" as const, workOrderId: WO_ID },
    adjustmentId: ADJUSTMENT_ID,
    expectedUpdatedAt: UPDATED_AT,
    patch: {},
    ...overrides,
  }
}

function found(
  over: { adjustment?: Record<string, unknown>; inventory?: Record<string, unknown> } = {},
) {
  return { adjustment: existingRow(over.adjustment), inventory: inventoryRow(over.inventory) }
}

const UPDATED = { id: ADJUSTMENT_ID, quantity: "3.00" }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  dbWomiFindUniqueMock.mockReset()
  getPendingAdjustmentWithInventoryForMutationMock.mockReset()
  getAdjustmentByIdMock.mockReset()
  lockInventoryForAdjustmentMock.mockReset()
  updatePendingAdjustmentRowMock.mockReset()
  recomputeAndPersistNetDeductedMock.mockReset()
  assertAdjustmentExpectedUpdatedAtMatchesMock.mockReset()
  assertAdjustmentLinkMutationAllowedMock.mockReset()
  assertAdjustmentLinkageRulesMock.mockReset()
  assertAdjustmentMetaMutationAllowedMock.mockReset()
  assertAdjustmentPendingMutationAllowedMock.mockReset()
  assertNetDeductedWithinStartingStockMock.mockReset()
  describeAdjustmentPendingFormIssuesMock.mockReset()
  validateAdjustmentPendingFormMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  dbWomiFindUniqueMock.mockResolvedValue({
    id: NEW_WOMI,
    workOrderId: NEW_WO,
    productId: PRODUCT_ID,
    workOrder: { warehouseId: WAREHOUSE_ID },
  })
  getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(found())
  assertAdjustmentExpectedUpdatedAtMatchesMock.mockReturnValue(undefined)
  assertAdjustmentLinkMutationAllowedMock.mockReturnValue(undefined)
  assertAdjustmentLinkageRulesMock.mockReturnValue(undefined)
  assertAdjustmentMetaMutationAllowedMock.mockReturnValue(undefined)
  assertAdjustmentPendingMutationAllowedMock.mockReturnValue(undefined)
  assertNetDeductedWithinStartingStockMock.mockReturnValue(undefined)
  validateAdjustmentPendingFormMock.mockReturnValue([])
  updatePendingAdjustmentRowMock.mockResolvedValue(UPDATED)
  getAdjustmentByIdMock.mockResolvedValue(UPDATED)
  recomputeAndPersistNetDeductedMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, netDeducted: "5.00" },
  ])
})

describe("updatePendingAdjustmentUseCase", () => {
  describe("happy path", () => {
    it("patches quantity when it changes, recomputes, and returns (location not re-snapped)", async () => {
      const result = await updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }))

      expect(result).toEqual({
        adjustment: UPDATED,
        inventoryId: INVENTORY_ID,
        netDeducted: "5.00",
      })
      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { quantity: "3" } },
      )
    })

    it("re-links to a new WOMI after resolving the target via the top-level db client", async () => {
      await updatePendingAdjustmentUseCase(
        input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
      )

      expect(dbWomiFindUniqueMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: NEW_WOMI } }),
      )
      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        {
          id: ADJUSTMENT_ID,
          patch: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI },
        },
      )
    })

    it("writes user-owned location only when the patch carries it, never re-snapped from the parent", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { location: "Bay 7" } }))

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { location: "Bay 7" } },
      )
    })

    it("does not touch location on a non-location field patch", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { isWaste: true } }))

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { isWaste: true } },
      )
    })
  })

  describe("always editable", () => {
    it("accepts a quantity + metadata patch on a once-finalized row (no freeze any more)", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(
        found({ adjustment: { status: "FINAL", isFinal: true } }),
      )

      await updatePendingAdjustmentUseCase(
        input({ patch: { quantity: "3", isWaste: true, notes: "rework", location: "Bay 7" } }),
      )

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        {
          id: ADJUSTMENT_ID,
          patch: { quantity: "3", isWaste: true, notes: "rework", location: "Bay 7" },
        },
      )
    })

    it("flips direction: writes adjustmentType, validates + re-checks linkage with the merged type", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { adjustmentType: "INCREASE" } }))

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { adjustmentType: "INCREASE" } },
      )
      // Form validation runs against the new (merged) direction, not the stale row.
      expect(validateAdjustmentPendingFormMock).toHaveBeenCalledWith(
        expect.objectContaining({ adjustmentType: "INCREASE" }),
      )
      // A direction change re-asserts linkage with the merged type + existing link.
      expect(assertAdjustmentLinkageRulesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          adjustmentType: "INCREASE",
          workOrderId: WO_ID,
        }),
      )
    })
  })

  describe("recompute gating", () => {
    it("skips the ledger replay + ceiling check on a metadata-only edit, returning the snapshot netDeducted", async () => {
      const result = await updatePendingAdjustmentUseCase(
        input({ patch: { isWaste: true, notes: "rework", location: "Bay 7" } }),
      )

      expect(recomputeAndPersistNetDeductedMock).not.toHaveBeenCalled()
      expect(assertNetDeductedWithinStartingStockMock).not.toHaveBeenCalled()
      expect(getAdjustmentByIdMock).not.toHaveBeenCalled()
      expect(result).toEqual({
        adjustment: UPDATED,
        inventoryId: INVENTORY_ID,
        netDeducted: "5.00",
      })
    })

    it("skips the ledger replay on a link-only edit (relink does not move the balance)", async () => {
      await updatePendingAdjustmentUseCase(
        input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
      )

      expect(recomputeAndPersistNetDeductedMock).not.toHaveBeenCalled()
      expect(assertNetDeductedWithinStartingStockMock).not.toHaveBeenCalled()
    })

    it("runs the ledger replay + ceiling check on a quantity edit", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }))

      expect(recomputeAndPersistNetDeductedMock).toHaveBeenCalledWith({ tx: true }, [INVENTORY_ID])
      expect(assertNetDeductedWithinStartingStockMock).toHaveBeenCalled()
    })

    it("runs the ledger replay + ceiling check on a direction flip", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { adjustmentType: "INCREASE" } }))

      expect(recomputeAndPersistNetDeductedMock).toHaveBeenCalledWith({ tx: true }, [INVENTORY_ID])
      expect(assertNetDeductedWithinStartingStockMock).toHaveBeenCalled()
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) when the adjustment is missing", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(null)

      await expect(
        updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } })),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_NOT_FOUND", status: 404 })
      expect(updatePendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("allows a link patch on an INCREASE row (an INCREASE may link a work order)", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(
        found({ adjustment: { adjustmentType: "INCREASE", workOrderId: null } }),
      )

      await updatePendingAdjustmentUseCase({
        scope: { kind: "inventory" as const, inventoryId: INVENTORY_ID },
        adjustmentId: ADJUSTMENT_ID,
        expectedUpdatedAt: UPDATED_AT,
        patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } },
      })

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        expect.objectContaining({
          id: ADJUSTMENT_ID,
          patch: expect.objectContaining({ workOrderId: NEW_WO, workOrderItemId: NEW_WOMI }),
        }),
      )
    })

    it("applies isWaste=true on an INCREASE row (waste allowed on either direction)", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(
        found({ adjustment: { adjustmentType: "INCREASE", workOrderId: null } }),
      )

      await updatePendingAdjustmentUseCase({
        scope: { kind: "inventory" as const, inventoryId: INVENTORY_ID },
        adjustmentId: ADJUSTMENT_ID,
        expectedUpdatedAt: UPDATED_AT,
        patch: { isWaste: true },
      })

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        expect.objectContaining({
          id: ADJUSTMENT_ID,
          patch: expect.objectContaining({ isWaste: true }),
        }),
      )
    })

    it("throws INVENTORY_ADJUSTMENT_STALE (409) when the OCC token does not match", async () => {
      assertAdjustmentExpectedUpdatedAtMatchesMock.mockImplementation(() => {
        throw new InventoryAdjustmentDomainErrorClass("INVENTORY_ADJUSTMENT_STALE_UPDATED_AT")
      })

      await expect(
        updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } })),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_STALE", status: 409 })
      expect(updatePendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("translates the netDeducted ceiling breach into INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY (400)", async () => {
      assertNetDeductedWithinStartingStockMock.mockImplementation(() => {
        throw new InventoryAdjustmentDomainErrorClass(
          "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
        )
      })

      await expect(
        updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } })),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY", status: 400 })
    })
  })

  describe("re-link scope guards", () => {
    it("allows a relink when the target WO is in another warehouse (warehouse follows inventory, not the WO)", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: NEW_WO,
        productId: PRODUCT_ID,
      })

      await updatePendingAdjustmentUseCase(
        input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
      )

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        expect.objectContaining({
          patch: expect.objectContaining({ workOrderId: NEW_WO, workOrderItemId: NEW_WOMI }),
        }),
      )
    })

    it("throws INVENTORY_ADJUSTMENT_LINK_SCOPE_MISMATCH (400) when the target WOMI is for another product", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: NEW_WO,
        productId: "prod-other",
        workOrder: { warehouseId: WAREHOUSE_ID },
      })

      await expect(
        updatePendingAdjustmentUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_LINK_SCOPE_MISMATCH", status: 400 })
    })

    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) pre-transaction when the re-link target is missing", async () => {
      dbWomiFindUniqueMock.mockResolvedValue(null)

      await expect(
        updatePendingAdjustmentUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_NOT_FOUND", status: 404 })
      expect(getPendingAdjustmentWithInventoryForMutationMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_SCOPE_MISMATCH (400) when the target WOMI belongs to another WO", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: "wo-other",
        productId: PRODUCT_ID,
        workOrder: { warehouseId: WAREHOUSE_ID },
      })

      await expect(
        updatePendingAdjustmentUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH", status: 400 })
    })

    it("allows a relink when the target WO has no warehouse (a WO no longer requires a warehouse)", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: NEW_WO,
        productId: PRODUCT_ID,
      })

      await updatePendingAdjustmentUseCase(
        input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
      )

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        expect.objectContaining({
          patch: expect.objectContaining({ workOrderId: NEW_WO, workOrderItemId: NEW_WOMI }),
        }),
      )
    })
  })

  it("throws INVENTORY_ADJUSTMENT_SCOPE_MISMATCH (400) when the row belongs to another work order", async () => {
    getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(
      found({ adjustment: { workOrderId: "wo-other" } }),
    )

    try {
      await updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }))
      expect.fail("Expected throw")
    } catch (error) {
      if (!(error instanceof InventoryAdjustmentExecutionError)) throw error
      expect(error.code).toBe("INVENTORY_ADJUSTMENT_SCOPE_MISMATCH")
      expect(error.status).toBe(400)
    }
    expect(updatePendingAdjustmentRowMock).not.toHaveBeenCalled()
  })
})
