import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryForCutLogMock,
  applyVoidToCutLogMock,
  recomputeAndPersistTotalCutSumsMock,
  canVoidCutLogMock,
  assertCutSumWithinStartingStockMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockInventoryForCutLogMock: vi.fn(),
  applyVoidToCutLogMock: vi.fn(),
  recomputeAndPersistTotalCutSumsMock: vi.fn(),
  canVoidCutLogMock: vi.fn(),
  assertCutSumWithinStartingStockMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryForCutLog: lockInventoryForCutLogMock,
  applyVoidToCutLog: applyVoidToCutLogMock,
  recomputeAndPersistTotalCutSums: recomputeAndPersistTotalCutSumsMock,
}))

vi.mock("@builders/domain", () => ({
  canVoidCutLog: canVoidCutLogMock,
  assertCutSumWithinStartingStock: assertCutSumWithinStartingStockMock,
}))

import { voidCutLogUseCase } from "../../../../src/flooring/inventory/cut-logs/void-cut-log.js"
import { CutLogExecutionError } from "../../../../src/flooring/inventory/cut-logs/errors.js"

const CUT_LOG_ID = "40000000-0000-4000-8000-000000000004"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const WO_ID = "10000000-0000-4000-8000-000000000001"

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CUT_LOG_ID,
    inventoryId: INVENTORY_ID,
    workOrderId: WO_ID,
    status: "PENDING",
    isFinal: false,
    void: false,
    ...overrides,
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    scope: { kind: "inventory" as const, inventoryId: INVENTORY_ID },
    cutLogId: CUT_LOG_ID,
    ...overrides,
  }
}

const VOIDED_CUTLOG = { id: CUT_LOG_ID, status: "VOID" }

let tx: {
  flooringCutLog: { findUnique: ReturnType<typeof vi.fn> }
  flooringInventory: { findUniqueOrThrow: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryForCutLogMock.mockReset()
  applyVoidToCutLogMock.mockReset()
  recomputeAndPersistTotalCutSumsMock.mockReset()
  canVoidCutLogMock.mockReset()
  assertCutSumWithinStartingStockMock.mockReset()

  tx = {
    flooringCutLog: { findUnique: vi.fn() },
    flooringInventory: { findUniqueOrThrow: vi.fn() },
  }
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx))

  tx.flooringCutLog.findUnique.mockResolvedValue(existingRow())
  tx.flooringInventory.findUniqueOrThrow.mockResolvedValue({ startingStock: "100.00" })
  canVoidCutLogMock.mockReturnValue(true)
  applyVoidToCutLogMock.mockResolvedValue(VOIDED_CUTLOG)
  recomputeAndPersistTotalCutSumsMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, totalCutSum: "0.00" },
  ])
  assertCutSumWithinStartingStockMock.mockReturnValue(undefined)
})

describe("voidCutLogUseCase", () => {
  describe("happy path", () => {
    it("voids a pending cut log and returns the recomputed total", async () => {
      const result = await voidCutLogUseCase(input())

      expect(result).toEqual({ cutLog: VOIDED_CUTLOG, inventoryId: INVENTORY_ID, totalCutSum: "0.00" })
      expect(applyVoidToCutLogMock).toHaveBeenCalledWith(tx, CUT_LOG_ID)
    })

    it("voids a finalized cut log", async () => {
      tx.flooringCutLog.findUnique.mockResolvedValue(existingRow({ status: "FINAL", isFinal: true }))

      const result = await voidCutLogUseCase(input())

      expect(result.cutLog).toBe(VOIDED_CUTLOG)
      expect(applyVoidToCutLogMock).toHaveBeenCalledWith(tx, CUT_LOG_ID)
    })

    it("locks the parent inventory before applying the void", async () => {
      await voidCutLogUseCase(input())

      const lockOrder = lockInventoryForCutLogMock.mock.invocationCallOrder[0]!
      const voidOrder = applyVoidToCutLogMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(voidOrder)
    })
  })

  describe("guards", () => {
    it("throws CUT_LOG_NOT_FOUND (404) when the cut log is missing", async () => {
      tx.flooringCutLog.findUnique.mockResolvedValue(null)

      await expect(voidCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_NOT_FOUND",
        status: 404,
      })
      expect(applyVoidToCutLogMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_VOID_NOT_ALLOWED (409) when the lifecycle gate rejects", async () => {
      canVoidCutLogMock.mockReturnValue(false)

      await expect(voidCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_VOID_NOT_ALLOWED",
        status: 409,
      })
      expect(applyVoidToCutLogMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_SCOPE_MISMATCH (400) when the row belongs to another inventory", async () => {
      tx.flooringCutLog.findUnique.mockResolvedValue(existingRow({ inventoryId: "inv-other" }))

      try {
        await voidCutLogUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof CutLogExecutionError)) throw error
        expect(error.code).toBe("CUT_LOG_SCOPE_MISMATCH")
        expect(error.status).toBe(400)
      }
      expect(applyVoidToCutLogMock).not.toHaveBeenCalled()
    })
  })
})
