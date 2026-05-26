import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryForCutLogMock,
  applyFinalizeCutLogMock,
  getCutLogByIdMock,
  assertBeforeCutAfterInvariantMock,
  canFinalizeCutLogMock,
  getCutLogFinalizabilityBlockerMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockInventoryForCutLogMock: vi.fn(),
  applyFinalizeCutLogMock: vi.fn(),
  getCutLogByIdMock: vi.fn(),
  assertBeforeCutAfterInvariantMock: vi.fn(),
  canFinalizeCutLogMock: vi.fn(),
  getCutLogFinalizabilityBlockerMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryForCutLog: lockInventoryForCutLogMock,
  applyFinalizeCutLog: applyFinalizeCutLogMock,
  getCutLogById: getCutLogByIdMock,
}))

vi.mock("@builders/domain", () => ({
  assertBeforeCutAfterInvariant: assertBeforeCutAfterInvariantMock,
  canFinalizeCutLog: canFinalizeCutLogMock,
  getCutLogFinalizabilityBlocker: getCutLogFinalizabilityBlockerMock,
}))

import { finalizeCutLogUseCase } from "../../../../src/flooring/inventory/cut-logs/finalize-cut-log.js"
import { CutLogExecutionError } from "../../../../src/flooring/inventory/cut-logs/errors.js"

const CUT_LOG_ID = "40000000-0000-4000-8000-000000000004"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const WO_ID = "10000000-0000-4000-8000-000000000001"

function fullRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CUT_LOG_ID,
    cutLogNumber: 7,
    workOrderId: WO_ID,
    workOrderItemId: "womi-1",
    inventoryId: INVENTORY_ID,
    status: "PENDING",
    isFinal: false,
    void: false,
    cut: "3",
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

const FINAL_CUTLOG = { id: CUT_LOG_ID, status: "FINAL" }

let tx: { flooringCutLog: { findUnique: ReturnType<typeof vi.fn> } }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryForCutLogMock.mockReset()
  applyFinalizeCutLogMock.mockReset()
  getCutLogByIdMock.mockReset()
  assertBeforeCutAfterInvariantMock.mockReset()
  canFinalizeCutLogMock.mockReset()
  getCutLogFinalizabilityBlockerMock.mockReset()

  tx = { flooringCutLog: { findUnique: vi.fn() } }
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx))

  getCutLogFinalizabilityBlockerMock.mockReturnValue(null)
  canFinalizeCutLogMock.mockReturnValue(true)
  assertBeforeCutAfterInvariantMock.mockReturnValue(undefined)
  applyFinalizeCutLogMock.mockResolvedValue({
    stampedRow: { id: CUT_LOG_ID, before: "10.00", cut: "3.00", after: "7.00" },
  })
  getCutLogByIdMock.mockResolvedValue(FINAL_CUTLOG)
})

describe("finalizeCutLogUseCase", () => {
  describe("happy path", () => {
    it("stamps the row, asserts the invariant, and returns the re-read cut log", async () => {
      tx.flooringCutLog.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow())

      const result = await finalizeCutLogUseCase(input())

      expect(result).toEqual({ cutLog: FINAL_CUTLOG })
      expect(applyFinalizeCutLogMock).toHaveBeenCalledWith(tx, { cutLogId: CUT_LOG_ID })
      expect(assertBeforeCutAfterInvariantMock).toHaveBeenCalledWith({
        before: "10.00",
        cut: "3.00",
        after: "7.00",
      })
    })

    it("locks the inventory after the identity read and before the full row read", async () => {
      tx.flooringCutLog.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow())

      await finalizeCutLogUseCase(input())

      const firstReadOrder = tx.flooringCutLog.findUnique.mock.invocationCallOrder[0]!
      const lockOrder = lockInventoryForCutLogMock.mock.invocationCallOrder[0]!
      const secondReadOrder = tx.flooringCutLog.findUnique.mock.invocationCallOrder[1]!
      expect(firstReadOrder).toBeLessThan(lockOrder)
      expect(lockOrder).toBeLessThan(secondReadOrder)
    })
  })

  describe("guards", () => {
    it("throws CUT_LOG_NOT_FOUND (404) and never locks when the identity read is empty", async () => {
      tx.flooringCutLog.findUnique.mockResolvedValueOnce(null)

      await expect(finalizeCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_NOT_FOUND",
        status: 404,
      })
      expect(lockInventoryForCutLogMock).not.toHaveBeenCalled()
      expect(applyFinalizeCutLogMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_NOT_FOUND (404) when the row vanishes after the lock", async () => {
      tx.flooringCutLog.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(null)

      await expect(finalizeCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_NOT_FOUND",
        status: 404,
      })
      expect(applyFinalizeCutLogMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_SCOPE_MISMATCH (400) when the row belongs to another inventory", async () => {
      tx.flooringCutLog.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow({ inventoryId: "inv-other" }))

      try {
        await finalizeCutLogUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof CutLogExecutionError)) throw error
        expect(error.code).toBe("CUT_LOG_SCOPE_MISMATCH")
        expect(error.status).toBe(400)
      }
      expect(applyFinalizeCutLogMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_FINALIZE_BLOCKED (409) when the row is not finalizable", async () => {
      tx.flooringCutLog.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow({ isFinal: true }))
      getCutLogFinalizabilityBlockerMock.mockReturnValue("ALREADY_FINAL")
      canFinalizeCutLogMock.mockReturnValue(false)

      await expect(finalizeCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_FINALIZE_BLOCKED",
        status: 409,
      })
      expect(applyFinalizeCutLogMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_NOT_FOUND (404) when stamping returns no row", async () => {
      tx.flooringCutLog.findUnique
        .mockResolvedValueOnce({ inventoryId: INVENTORY_ID })
        .mockResolvedValueOnce(fullRow())
      applyFinalizeCutLogMock.mockResolvedValue({ stampedRow: null })

      await expect(finalizeCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_NOT_FOUND",
        status: 404,
      })
      expect(getCutLogByIdMock).not.toHaveBeenCalled()
    })
  })
})
