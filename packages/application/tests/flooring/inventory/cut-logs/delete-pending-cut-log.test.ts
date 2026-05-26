import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getPendingCutLogWithInventoryForMutationMock,
  lockInventoryForCutLogMock,
  deletePendingCutLogRowMock,
  recomputeAndPersistTotalCutSumsMock,
  assertCutLogExpectedUpdatedAtMatchesMock,
  assertCutLogPendingMutationAllowedMock,
  assertCutSumWithinStartingStockMock,
  CutLogDomainErrorClass,
} = vi.hoisted(() => {
  class CutLogDomainError extends Error {
    code: string
    detail?: unknown
    constructor(code: string, detail?: unknown) {
      super(code)
      this.name = "CutLogDomainError"
      this.code = code
      this.detail = detail
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    getPendingCutLogWithInventoryForMutationMock: vi.fn(),
    lockInventoryForCutLogMock: vi.fn(),
    deletePendingCutLogRowMock: vi.fn(),
    recomputeAndPersistTotalCutSumsMock: vi.fn(),
    assertCutLogExpectedUpdatedAtMatchesMock: vi.fn(),
    assertCutLogPendingMutationAllowedMock: vi.fn(),
    assertCutSumWithinStartingStockMock: vi.fn(),
    CutLogDomainErrorClass: CutLogDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getPendingCutLogWithInventoryForMutation: getPendingCutLogWithInventoryForMutationMock,
  lockInventoryForCutLog: lockInventoryForCutLogMock,
  deletePendingCutLogRow: deletePendingCutLogRowMock,
  recomputeAndPersistTotalCutSums: recomputeAndPersistTotalCutSumsMock,
}))

vi.mock("@builders/domain", () => ({
  CutLogDomainError: CutLogDomainErrorClass,
  assertCutLogExpectedUpdatedAtMatches: assertCutLogExpectedUpdatedAtMatchesMock,
  assertCutLogPendingMutationAllowed: assertCutLogPendingMutationAllowedMock,
  assertCutSumWithinStartingStock: assertCutSumWithinStartingStockMock,
}))

import { deletePendingCutLogUseCase } from "../../../../src/flooring/inventory/cut-logs/delete-pending-cut-log.js"
import { CutLogExecutionError } from "../../../../src/flooring/inventory/cut-logs/errors.js"

const WO_ID = "10000000-0000-4000-8000-000000000001"
const CUT_LOG_ID = "40000000-0000-4000-8000-000000000004"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const UPDATED_AT = "2026-01-01T00:00:00.000Z"

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CUT_LOG_ID,
    workOrderId: WO_ID,
    inventoryId: INVENTORY_ID,
    status: "PENDING",
    isFinal: false,
    void: false,
    updatedAt: UPDATED_AT,
    ...overrides,
  }
}

function found(cutLogOverrides: Record<string, unknown> = {}) {
  return {
    cutLog: existingRow(cutLogOverrides),
    inventory: { startingStock: "100.00", stockUnitAbbrev: "sf" },
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    scope: { kind: "work-order" as const, workOrderId: WO_ID },
    cutLogId: CUT_LOG_ID,
    expectedUpdatedAt: UPDATED_AT,
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getPendingCutLogWithInventoryForMutationMock.mockReset()
  lockInventoryForCutLogMock.mockReset()
  deletePendingCutLogRowMock.mockReset()
  recomputeAndPersistTotalCutSumsMock.mockReset()
  assertCutLogExpectedUpdatedAtMatchesMock.mockReset()
  assertCutLogPendingMutationAllowedMock.mockReset()
  assertCutSumWithinStartingStockMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(found())
  assertCutLogExpectedUpdatedAtMatchesMock.mockReturnValue(undefined)
  assertCutLogPendingMutationAllowedMock.mockReturnValue(undefined)
  assertCutSumWithinStartingStockMock.mockReturnValue(undefined)
  deletePendingCutLogRowMock.mockResolvedValue(undefined)
  recomputeAndPersistTotalCutSumsMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, totalCutSum: "0.00" },
  ])
})

describe("deletePendingCutLogUseCase", () => {
  describe("happy path", () => {
    it("deletes the row and returns deletedId + recomputed total", async () => {
      const result = await deletePendingCutLogUseCase(input())

      expect(result).toEqual({
        deletedId: CUT_LOG_ID,
        inventoryId: INVENTORY_ID,
        totalCutSum: "0.00",
      })
      expect(deletePendingCutLogRowMock).toHaveBeenCalledWith({ tx: true }, { id: CUT_LOG_ID })
    })

    it("locks before deleting and deletes before recomputing", async () => {
      await deletePendingCutLogUseCase(input())

      const lockOrder = lockInventoryForCutLogMock.mock.invocationCallOrder[0]!
      const deleteOrder = deletePendingCutLogRowMock.mock.invocationCallOrder[0]!
      const recomputeOrder = recomputeAndPersistTotalCutSumsMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(deleteOrder)
      expect(deleteOrder).toBeLessThan(recomputeOrder)
    })
  })

  describe("guards", () => {
    it("throws CUT_LOG_NOT_FOUND (404) when the cut log is missing", async () => {
      getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(null)

      await expect(deletePendingCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_NOT_FOUND",
        status: 404,
      })
      expect(deletePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_DELETE_NOT_ALLOWED (409) for a finalized row", async () => {
      getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(
        found({ status: "FINAL", isFinal: true }),
      )
      assertCutLogPendingMutationAllowedMock.mockImplementation(() => {
        throw new CutLogDomainErrorClass("CUT_LOG_PENDING_INPUT_NOT_ALLOWED")
      })

      await expect(deletePendingCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_DELETE_NOT_ALLOWED",
        status: 409,
      })
      expect(deletePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_STALE (409) when the OCC token does not match", async () => {
      assertCutLogExpectedUpdatedAtMatchesMock.mockImplementation(() => {
        throw new CutLogDomainErrorClass("CUT_LOG_STALE_UPDATED_AT")
      })

      await expect(deletePendingCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_STALE",
        status: 409,
      })
      expect(deletePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_SCOPE_MISMATCH (400) when the row belongs to another work order", async () => {
      getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(
        found({ workOrderId: "wo-other" }),
      )

      try {
        await deletePendingCutLogUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof CutLogExecutionError)) throw error
        expect(error.code).toBe("CUT_LOG_SCOPE_MISMATCH")
        expect(error.status).toBe(400)
      }
      expect(deletePendingCutLogRowMock).not.toHaveBeenCalled()
    })
  })
})
