import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getPendingAdjustmentWithInventoryForMutationMock,
  getAdjustmentByIdMock,
  lockInventoryForAdjustmentMock,
  updatePendingAdjustmentRowMock,
  recomputeAndPersistNetDeductedMock,
  assertAdjustmentExpectedUpdatedAtMatchesMock,
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
    getPendingAdjustmentWithInventoryForMutationMock: vi.fn(),
    getAdjustmentByIdMock: vi.fn(),
    lockInventoryForAdjustmentMock: vi.fn(),
    updatePendingAdjustmentRowMock: vi.fn(),
    recomputeAndPersistNetDeductedMock: vi.fn(),
    assertAdjustmentExpectedUpdatedAtMatchesMock: vi.fn(),
    assertNetDeductedWithinStartingStockMock: vi.fn(),
    describeAdjustmentPendingFormIssuesMock: vi.fn(),
    validateAdjustmentPendingFormMock: vi.fn(),
    InventoryAdjustmentDomainErrorClass: InventoryAdjustmentDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
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
const UPDATED_AT = "2026-01-01T00:00:00.000Z"
const ACTOR = "actor@example.com"

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ADJUSTMENT_ID,
    workOrderId: WO_ID,
    inventoryId: INVENTORY_ID,
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
  getPendingAdjustmentWithInventoryForMutationMock.mockReset()
  getAdjustmentByIdMock.mockReset()
  lockInventoryForAdjustmentMock.mockReset()
  updatePendingAdjustmentRowMock.mockReset()
  recomputeAndPersistNetDeductedMock.mockReset()
  assertAdjustmentExpectedUpdatedAtMatchesMock.mockReset()
  assertNetDeductedWithinStartingStockMock.mockReset()
  describeAdjustmentPendingFormIssuesMock.mockReset()
  validateAdjustmentPendingFormMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(found())
  assertAdjustmentExpectedUpdatedAtMatchesMock.mockReturnValue(undefined)
  assertNetDeductedWithinStartingStockMock.mockReturnValue(undefined)
  validateAdjustmentPendingFormMock.mockReturnValue([])
  updatePendingAdjustmentRowMock.mockResolvedValue(UPDATED)
  getAdjustmentByIdMock.mockResolvedValue(UPDATED)
  recomputeAndPersistNetDeductedMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, netDeducted: "5.00" },
  ])
})

describe("updatePendingAdjustmentUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }), "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(updatePendingAdjustmentRowMock).not.toHaveBeenCalled()
  })

  describe("happy path", () => {
    it("patches quantity when it changes, recomputes, and returns (location not re-snapped)", async () => {
      const result = await updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }), ACTOR)

      expect(result).toEqual({
        adjustment: UPDATED,
        inventoryId: INVENTORY_ID,
        netDeducted: "5.00",
      })
      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { quantity: "3", updatedBy: ACTOR } },
      )
    })

    it("re-links to a new work order with a plain workOrderId patch (any product)", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { link: { workOrderId: NEW_WO } } }), ACTOR)

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { workOrderId: NEW_WO, updatedBy: ACTOR } },
      )
    })

    it("unlinks the work order with a null workOrderId patch", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { link: { workOrderId: null } } }), ACTOR)

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { workOrderId: null, updatedBy: ACTOR } },
      )
    })

    it("writes user-owned location only when the patch carries it, never re-snapped from the parent", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { location: "Bay 7" } }), ACTOR)

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { location: "Bay 7", updatedBy: ACTOR } },
      )
    })

    it("does not touch location on a non-location field patch", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { isWaste: true } }), ACTOR)

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { isWaste: true, updatedBy: ACTOR } },
      )
    })
  })

  describe("always editable", () => {
    it("flips direction: writes adjustmentType and validates against the merged type", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { adjustmentType: "INCREASE" } }), ACTOR)

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID, patch: { adjustmentType: "INCREASE", updatedBy: ACTOR } },
      )
      // Form validation runs against the new (merged) direction, not the stale row.
      expect(validateAdjustmentPendingFormMock).toHaveBeenCalledWith(
        expect.objectContaining({ adjustmentType: "INCREASE" }),
      )
    })
  })

  describe("recompute gating", () => {
    it("skips the ledger replay + ceiling check on a metadata-only edit, returning the snapshot netDeducted", async () => {
      const result = await updatePendingAdjustmentUseCase(
        input({ patch: { isWaste: true, notes: "rework", location: "Bay 7" } }),
        ACTOR,
      )

      expect(recomputeAndPersistNetDeductedMock).not.toHaveBeenCalled()
      expect(assertNetDeductedWithinStartingStockMock).not.toHaveBeenCalled()
      expect(getAdjustmentByIdMock).not.toHaveBeenCalled()
      expect(result).toEqual({
        adjustment: UPDATED,
        inventoryId: INVENTORY_ID,
        netDeducted: "5.00",
      })
      // Even a metadata-only edit (no ledger replay) still stamps the editor —
      // the stamp lives in the write primitive, before the recompute branch.
      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        {
          id: ADJUSTMENT_ID,
          patch: { isWaste: true, notes: "rework", location: "Bay 7", updatedBy: ACTOR },
        },
      )
    })

    it("skips the ledger replay on a link-only edit (relink does not move the balance)", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { link: { workOrderId: NEW_WO } } }), ACTOR)

      expect(recomputeAndPersistNetDeductedMock).not.toHaveBeenCalled()
      expect(assertNetDeductedWithinStartingStockMock).not.toHaveBeenCalled()
    })

    it("runs the ledger replay + ceiling check on a quantity edit", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }), ACTOR)

      expect(recomputeAndPersistNetDeductedMock).toHaveBeenCalledWith({ tx: true }, [INVENTORY_ID])
      expect(assertNetDeductedWithinStartingStockMock).toHaveBeenCalled()
    })

    it("runs the ledger replay + ceiling check on a direction flip", async () => {
      await updatePendingAdjustmentUseCase(input({ patch: { adjustmentType: "INCREASE" } }), ACTOR)

      expect(recomputeAndPersistNetDeductedMock).toHaveBeenCalledWith({ tx: true }, [INVENTORY_ID])
      expect(assertNetDeductedWithinStartingStockMock).toHaveBeenCalled()
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) when the adjustment is missing", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(null)

      await expect(
        updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }), ACTOR),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_NOT_FOUND", status: 404 })
      expect(updatePendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("allows a link patch on an INCREASE row (an INCREASE may link a work order)", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(
        found({ adjustment: { adjustmentType: "INCREASE", workOrderId: null } }),
      )

      await updatePendingAdjustmentUseCase(
        {
          scope: { kind: "inventory" as const, inventoryId: INVENTORY_ID },
          adjustmentId: ADJUSTMENT_ID,
          expectedUpdatedAt: UPDATED_AT,
          patch: { link: { workOrderId: NEW_WO } },
        },
        ACTOR,
      )

      expect(updatePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        expect.objectContaining({
          id: ADJUSTMENT_ID,
          patch: expect.objectContaining({ workOrderId: NEW_WO }),
        }),
      )
    })

    it("throws INVENTORY_ADJUSTMENT_STALE (409) when the OCC token does not match", async () => {
      assertAdjustmentExpectedUpdatedAtMatchesMock.mockImplementation(() => {
        throw new InventoryAdjustmentDomainErrorClass("INVENTORY_ADJUSTMENT_STALE_UPDATED_AT")
      })

      await expect(
        updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }), ACTOR),
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
        updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }), ACTOR),
      ).rejects.toMatchObject({ code: "INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY", status: 400 })
    })

    it("throws INVENTORY_ADJUSTMENT_SCOPE_MISMATCH (400) when the row belongs to another work order", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(
        found({ adjustment: { workOrderId: "wo-other" } }),
      )

      try {
        await updatePendingAdjustmentUseCase(input({ patch: { quantity: "3" } }), ACTOR)
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryAdjustmentExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_ADJUSTMENT_SCOPE_MISMATCH")
        expect(error.status).toBe(400)
      }
      expect(updatePendingAdjustmentRowMock).not.toHaveBeenCalled()
    })
  })
})
