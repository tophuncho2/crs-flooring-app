import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getPendingAdjustmentWithInventoryForMutationMock,
  lockInventoryForAdjustmentMock,
  deletePendingAdjustmentRowMock,
  recomputeAndPersistNetDeductedMock,
  assertAdjustmentExpectedUpdatedAtMatchesMock,
  assertAdjustmentPendingMutationAllowedMock,
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
    getPendingAdjustmentWithInventoryForMutationMock: vi.fn(),
    lockInventoryForAdjustmentMock: vi.fn(),
    deletePendingAdjustmentRowMock: vi.fn(),
    recomputeAndPersistNetDeductedMock: vi.fn(),
    assertAdjustmentExpectedUpdatedAtMatchesMock: vi.fn(),
    assertAdjustmentPendingMutationAllowedMock: vi.fn(),
    assertNetDeductedWithinStartingStockMock: vi.fn(),
    InventoryAdjustmentDomainErrorClass: InventoryAdjustmentDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getPendingAdjustmentWithInventoryForMutation: getPendingAdjustmentWithInventoryForMutationMock,
  lockInventoryForAdjustment: lockInventoryForAdjustmentMock,
  deletePendingAdjustmentRow: deletePendingAdjustmentRowMock,
  recomputeAndPersistNetDeducted: recomputeAndPersistNetDeductedMock,
}))

vi.mock("@builders/domain", () => ({
  InventoryAdjustmentDomainError: InventoryAdjustmentDomainErrorClass,
  assertAdjustmentExpectedUpdatedAtMatches: assertAdjustmentExpectedUpdatedAtMatchesMock,
  assertAdjustmentPendingMutationAllowed: assertAdjustmentPendingMutationAllowedMock,
  assertNetDeductedWithinStartingStock: assertNetDeductedWithinStartingStockMock,
}))

import { deletePendingAdjustmentUseCase } from "../../../src/inventory/adjustments/delete-pending-adjustment.js"
import { InventoryAdjustmentExecutionError } from "../../../src/inventory/adjustments/errors.js"

const WO_ID = "10000000-0000-4000-8000-000000000001"
const ADJUSTMENT_ID = "40000000-0000-4000-8000-000000000004"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const UPDATED_AT = "2026-01-01T00:00:00.000Z"

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ADJUSTMENT_ID,
    workOrderId: WO_ID,
    inventoryId: INVENTORY_ID,
    adjustmentType: "DEDUCTION",
    updatedAt: UPDATED_AT,
    ...overrides,
  }
}

function found(adjustmentOverrides: Record<string, unknown> = {}) {
  return {
    adjustment: existingRow(adjustmentOverrides),
    inventory: { startingStock: "100.00", unitAbbrev: "sf" },
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    scope: { kind: "work-order" as const, workOrderId: WO_ID },
    adjustmentId: ADJUSTMENT_ID,
    expectedUpdatedAt: UPDATED_AT,
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getPendingAdjustmentWithInventoryForMutationMock.mockReset()
  lockInventoryForAdjustmentMock.mockReset()
  deletePendingAdjustmentRowMock.mockReset()
  recomputeAndPersistNetDeductedMock.mockReset()
  assertAdjustmentExpectedUpdatedAtMatchesMock.mockReset()
  assertAdjustmentPendingMutationAllowedMock.mockReset()
  assertNetDeductedWithinStartingStockMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(found())
  assertAdjustmentExpectedUpdatedAtMatchesMock.mockReturnValue(undefined)
  assertAdjustmentPendingMutationAllowedMock.mockReturnValue(undefined)
  assertNetDeductedWithinStartingStockMock.mockReturnValue(undefined)
  deletePendingAdjustmentRowMock.mockResolvedValue(undefined)
  recomputeAndPersistNetDeductedMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, netDeducted: "0.00" },
  ])
})

describe("deletePendingAdjustmentUseCase", () => {
  describe("happy path", () => {
    it("deletes the row and returns deletedId + recomputed netDeducted", async () => {
      const result = await deletePendingAdjustmentUseCase(input())

      expect(result).toEqual({
        deletedId: ADJUSTMENT_ID,
        inventoryId: INVENTORY_ID,
        netDeducted: "0.00",
      })
      expect(deletePendingAdjustmentRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: ADJUSTMENT_ID },
      )
    })

    it("locks before deleting and deletes before recomputing", async () => {
      await deletePendingAdjustmentUseCase(input())

      const lockOrder = lockInventoryForAdjustmentMock.mock.invocationCallOrder[0]!
      const deleteOrder = deletePendingAdjustmentRowMock.mock.invocationCallOrder[0]!
      const recomputeOrder = recomputeAndPersistNetDeductedMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(deleteOrder)
      expect(deleteOrder).toBeLessThan(recomputeOrder)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) when the adjustment is missing", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(null)

      await expect(deletePendingAdjustmentUseCase(input())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        status: 404,
      })
      expect(deletePendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_STALE (409) when the OCC token does not match", async () => {
      assertAdjustmentExpectedUpdatedAtMatchesMock.mockImplementation(() => {
        throw new InventoryAdjustmentDomainErrorClass("INVENTORY_ADJUSTMENT_STALE_UPDATED_AT")
      })

      await expect(deletePendingAdjustmentUseCase(input())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_STALE",
        status: 409,
      })
      expect(deletePendingAdjustmentRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_SCOPE_MISMATCH (400) when the row belongs to another work order", async () => {
      getPendingAdjustmentWithInventoryForMutationMock.mockResolvedValue(
        found({ workOrderId: "wo-other" }),
      )

      try {
        await deletePendingAdjustmentUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryAdjustmentExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_ADJUSTMENT_SCOPE_MISMATCH")
        expect(error.status).toBe(400)
      }
      expect(deletePendingAdjustmentRowMock).not.toHaveBeenCalled()
    })
  })
})
