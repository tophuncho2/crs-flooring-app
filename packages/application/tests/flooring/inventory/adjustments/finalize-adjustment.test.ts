import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryForAdjustmentMock,
  applyFinalizeAdjustmentMock,
  getAdjustmentByIdMock,
  assertBeforeAfterInvariantMock,
  canFinalizeAdjustmentMock,
  getAdjustmentFinalizabilityBlockerMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockInventoryForAdjustmentMock: vi.fn(),
  applyFinalizeAdjustmentMock: vi.fn(),
  getAdjustmentByIdMock: vi.fn(),
  assertBeforeAfterInvariantMock: vi.fn(),
  canFinalizeAdjustmentMock: vi.fn(),
  getAdjustmentFinalizabilityBlockerMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryForAdjustment: lockInventoryForAdjustmentMock,
  applyFinalizeAdjustment: applyFinalizeAdjustmentMock,
  getAdjustmentById: getAdjustmentByIdMock,
}))

vi.mock("@builders/domain", () => ({
  assertBeforeAfterInvariant: assertBeforeAfterInvariantMock,
  canFinalizeAdjustment: canFinalizeAdjustmentMock,
  getAdjustmentFinalizabilityBlocker: getAdjustmentFinalizabilityBlockerMock,
}))

import { finalizeAdjustmentUseCase } from "../../../../src/flooring/inventory/adjustments/finalize-adjustment.js"
import { InventoryAdjustmentExecutionError } from "../../../../src/flooring/inventory/adjustments/errors.js"

const ADJUSTMENT_ID = "40000000-0000-4000-8000-000000000004"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const WO_ID = "10000000-0000-4000-8000-000000000001"

function fullRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ADJUSTMENT_ID,
    adjustmentNumber: "ADJ-7",
    workOrderId: WO_ID,
    workOrderItemId: "womi-1",
    inventoryId: INVENTORY_ID,
    status: "PENDING",
    isFinal: false,
    quantity: "3",
    ...overrides,
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    scope: { kind: "inventory" as const, inventoryId: INVENTORY_ID },
    adjustmentId: ADJUSTMENT_ID,
    ...overrides,
  }
}

const FINAL_ADJUSTMENT = { id: ADJUSTMENT_ID, status: "FINAL" }

let tx: { flooringInventoryAdjustment: { findUnique: ReturnType<typeof vi.fn> } }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryForAdjustmentMock.mockReset()
  applyFinalizeAdjustmentMock.mockReset()
  getAdjustmentByIdMock.mockReset()
  assertBeforeAfterInvariantMock.mockReset()
  canFinalizeAdjustmentMock.mockReset()
  getAdjustmentFinalizabilityBlockerMock.mockReset()

  tx = { flooringInventoryAdjustment: { findUnique: vi.fn() } }
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx))

  getAdjustmentFinalizabilityBlockerMock.mockReturnValue(null)
  canFinalizeAdjustmentMock.mockReturnValue(true)
  assertBeforeAfterInvariantMock.mockReturnValue(undefined)
  applyFinalizeAdjustmentMock.mockResolvedValue({
    stampedRow: { id: ADJUSTMENT_ID, before: "10.00", signedDelta: "3.00", after: "7.00" },
  })
  getAdjustmentByIdMock.mockResolvedValue(FINAL_ADJUSTMENT)
})

describe("finalizeAdjustmentUseCase", () => {
  describe("happy path", () => {
    it("stamps the row, asserts the invariant, and returns the re-read adjustment", async () => {
      tx.flooringInventoryAdjustment.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow())

      const result = await finalizeAdjustmentUseCase(input())

      expect(result).toEqual({ adjustment: FINAL_ADJUSTMENT })
      expect(applyFinalizeAdjustmentMock).toHaveBeenCalledWith(tx, {
        adjustmentId: ADJUSTMENT_ID,
      })
      expect(assertBeforeAfterInvariantMock).toHaveBeenCalledWith({
        before: "10.00",
        signedDelta: "3.00",
        after: "7.00",
      })
    })

    it("locks the inventory after the identity read and before the full row read", async () => {
      tx.flooringInventoryAdjustment.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow())

      await finalizeAdjustmentUseCase(input())

      const firstReadOrder = tx.flooringInventoryAdjustment.findUnique.mock.invocationCallOrder[0]!
      const lockOrder = lockInventoryForAdjustmentMock.mock.invocationCallOrder[0]!
      const secondReadOrder =
        tx.flooringInventoryAdjustment.findUnique.mock.invocationCallOrder[1]!
      expect(firstReadOrder).toBeLessThan(lockOrder)
      expect(lockOrder).toBeLessThan(secondReadOrder)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) and never locks when the identity read is empty", async () => {
      tx.flooringInventoryAdjustment.findUnique.mockResolvedValueOnce(null)

      await expect(finalizeAdjustmentUseCase(input())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        status: 404,
      })
      expect(lockInventoryForAdjustmentMock).not.toHaveBeenCalled()
      expect(applyFinalizeAdjustmentMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) when the row vanishes after the lock", async () => {
      tx.flooringInventoryAdjustment.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(null)

      await expect(finalizeAdjustmentUseCase(input())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        status: 404,
      })
      expect(applyFinalizeAdjustmentMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_SCOPE_MISMATCH (400) when the row belongs to another inventory", async () => {
      tx.flooringInventoryAdjustment.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow({ inventoryId: "inv-other" }))

      try {
        await finalizeAdjustmentUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryAdjustmentExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_ADJUSTMENT_SCOPE_MISMATCH")
        expect(error.status).toBe(400)
      }
      expect(applyFinalizeAdjustmentMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_FINALIZE_BLOCKED (409) when the row is not finalizable", async () => {
      tx.flooringInventoryAdjustment.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow({ isFinal: true }))
      getAdjustmentFinalizabilityBlockerMock.mockReturnValue("ALREADY_FINAL")
      canFinalizeAdjustmentMock.mockReturnValue(false)

      await expect(finalizeAdjustmentUseCase(input())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_FINALIZE_BLOCKED",
        status: 409,
      })
      expect(applyFinalizeAdjustmentMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_ADJUSTMENT_NOT_FOUND (404) when stamping returns no row", async () => {
      tx.flooringInventoryAdjustment.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow())
      applyFinalizeAdjustmentMock.mockResolvedValue({ stampedRow: null })

      await expect(finalizeAdjustmentUseCase(input())).rejects.toMatchObject({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        status: 404,
      })
      expect(getAdjustmentByIdMock).not.toHaveBeenCalled()
    })
  })
})
