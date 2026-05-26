import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryForCutLogMock,
  getInventoryParentContextForCutLogsMock,
  insertPendingCutLogRowMock,
  recomputeAndPersistTotalCutSumsMock,
  validateCutLogPendingFormMock,
  describeCutLogPendingFormIssuesMock,
  assertCutLogLinkageSymmetryMock,
  deriveCutLogCoverageCutStringMock,
  buildPendingCutLogInventorySnapshotMock,
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
    lockInventoryForCutLogMock: vi.fn(),
    getInventoryParentContextForCutLogsMock: vi.fn(),
    insertPendingCutLogRowMock: vi.fn(),
    recomputeAndPersistTotalCutSumsMock: vi.fn(),
    validateCutLogPendingFormMock: vi.fn(),
    describeCutLogPendingFormIssuesMock: vi.fn(),
    assertCutLogLinkageSymmetryMock: vi.fn(),
    deriveCutLogCoverageCutStringMock: vi.fn(),
    buildPendingCutLogInventorySnapshotMock: vi.fn(),
    assertCutSumWithinStartingStockMock: vi.fn(),
    CutLogDomainErrorClass: CutLogDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryForCutLog: lockInventoryForCutLogMock,
  getInventoryParentContextForCutLogs: getInventoryParentContextForCutLogsMock,
  insertPendingCutLogRow: insertPendingCutLogRowMock,
  recomputeAndPersistTotalCutSums: recomputeAndPersistTotalCutSumsMock,
}))

vi.mock("@builders/domain", () => ({
  CutLogDomainError: CutLogDomainErrorClass,
  validateCutLogPendingForm: validateCutLogPendingFormMock,
  describeCutLogPendingFormIssues: describeCutLogPendingFormIssuesMock,
  assertCutLogLinkageSymmetry: assertCutLogLinkageSymmetryMock,
  deriveCutLogCoverageCutString: deriveCutLogCoverageCutStringMock,
  buildPendingCutLogInventorySnapshot: buildPendingCutLogInventorySnapshotMock,
  assertCutSumWithinStartingStock: assertCutSumWithinStartingStockMock,
}))

import { createPendingCutLogUseCase } from "../../../../src/flooring/inventory/cut-logs/create-pending-cut-log.js"
import { CutLogExecutionError } from "../../../../src/flooring/inventory/cut-logs/errors.js"

const WO_ID = "10000000-0000-4000-8000-000000000001"
const WOMI_ID = "20000000-0000-4000-8000-000000000002"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const CUT_LOG_ID = "40000000-0000-4000-8000-000000000004"

function input(overrides: Record<string, unknown> = {}) {
  return {
    workOrderId: WO_ID,
    workOrderItemId: WOMI_ID,
    inventoryId: INVENTORY_ID,
    cut: "5",
    isWaste: false,
    notes: "",
    ...overrides,
  }
}

// Fields the use case reads off `getInventoryParentContextForCutLogs`.
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

const INSERTED = { id: CUT_LOG_ID, cut: "5.00" }
const SNAPSHOT = { inventoryItem: "INV-5 · ROLL#R-1", snapshot: true }

let tx: { flooringWorkOrderItem: { findUnique: ReturnType<typeof vi.fn> } }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryForCutLogMock.mockReset()
  getInventoryParentContextForCutLogsMock.mockReset()
  insertPendingCutLogRowMock.mockReset()
  recomputeAndPersistTotalCutSumsMock.mockReset()
  validateCutLogPendingFormMock.mockReset()
  describeCutLogPendingFormIssuesMock.mockReset()
  assertCutLogLinkageSymmetryMock.mockReset()
  deriveCutLogCoverageCutStringMock.mockReset()
  buildPendingCutLogInventorySnapshotMock.mockReset()
  assertCutSumWithinStartingStockMock.mockReset()

  tx = { flooringWorkOrderItem: { findUnique: vi.fn() } }
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx))

  tx.flooringWorkOrderItem.findUnique.mockResolvedValue({ id: WOMI_ID, workOrderId: WO_ID })
  validateCutLogPendingFormMock.mockReturnValue([])
  describeCutLogPendingFormIssuesMock.mockReturnValue("form issue")
  assertCutLogLinkageSymmetryMock.mockReturnValue(undefined)
  getInventoryParentContextForCutLogsMock.mockResolvedValue(inventoryContext())
  deriveCutLogCoverageCutStringMock.mockReturnValue("12.50")
  buildPendingCutLogInventorySnapshotMock.mockReturnValue(SNAPSHOT)
  insertPendingCutLogRowMock.mockResolvedValue(INSERTED)
  recomputeAndPersistTotalCutSumsMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, totalCutSum: "5.00" },
  ])
  assertCutSumWithinStartingStockMock.mockReturnValue(undefined)
})

describe("createPendingCutLogUseCase", () => {
  describe("happy path", () => {
    it("inserts with derived coverageCut + inventory snapshot, recomputes, and returns the result", async () => {
      const result = await createPendingCutLogUseCase(input())

      expect(result).toEqual({
        cutLog: INSERTED,
        inventoryId: INVENTORY_ID,
        totalCutSum: "5.00",
      })
      expect(insertPendingCutLogRowMock).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          workOrderId: WO_ID,
          workOrderItemId: WOMI_ID,
          inventoryId: INVENTORY_ID,
          cut: "5",
          coverageCut: "12.50",
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
      expect(recomputeAndPersistTotalCutSumsMock).toHaveBeenCalledWith(tx, [INVENTORY_ID])
    })

    it("locks the parent inventory before reading its context", async () => {
      await createPendingCutLogUseCase(input())

      const lockOrder = lockInventoryForCutLogMock.mock.invocationCallOrder[0]!
      const contextOrder = getInventoryParentContextForCutLogsMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(contextOrder)
    })

    it("inserts the row before recomputing the inventory total", async () => {
      await createPendingCutLogUseCase(input())

      const insertOrder = insertPendingCutLogRowMock.mock.invocationCallOrder[0]!
      const recomputeOrder = recomputeAndPersistTotalCutSumsMock.mock.invocationCallOrder[0]!
      expect(insertOrder).toBeLessThan(recomputeOrder)
    })
  })

  describe("guards", () => {
    it("throws CUT_LOG_VALIDATION_FAILED (400) and never touches the WOMI when the form is invalid", async () => {
      validateCutLogPendingFormMock.mockReturnValue([{ code: "CUT_LOG_CUT_REQUIRED" }])

      await expect(createPendingCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_VALIDATION_FAILED",
        status: 400,
      })
      expect(tx.flooringWorkOrderItem.findUnique).not.toHaveBeenCalled()
      expect(insertPendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_NOT_FOUND (404) when the WOMI does not exist", async () => {
      tx.flooringWorkOrderItem.findUnique.mockResolvedValue(null)

      await expect(createPendingCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_NOT_FOUND",
        status: 404,
      })
      expect(insertPendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_SCOPE_MISMATCH (400) when the WOMI belongs to another work order", async () => {
      tx.flooringWorkOrderItem.findUnique.mockResolvedValue({
        id: WOMI_ID,
        workOrderId: "different-wo",
      })

      await expect(createPendingCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_SCOPE_MISMATCH",
        status: 400,
      })
      expect(insertPendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_NOT_FOUND (404) when the parent inventory is missing", async () => {
      getInventoryParentContextForCutLogsMock.mockResolvedValue(null)

      await expect(createPendingCutLogUseCase(input())).rejects.toMatchObject({
        code: "CUT_LOG_NOT_FOUND",
        status: 404,
      })
      expect(insertPendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("translates the totalCutSum invariant breach into CUT_LOG_EXCEEDS_INVENTORY (400)", async () => {
      assertCutSumWithinStartingStockMock.mockImplementation(() => {
        throw new CutLogDomainErrorClass("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {})
      })

      try {
        await createPendingCutLogUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof CutLogExecutionError)) throw error
        expect(error.code).toBe("CUT_LOG_EXCEEDS_INVENTORY")
        expect(error.status).toBe(400)
        expect(error.payload).toMatchObject({ inventoryId: INVENTORY_ID, totalCutSum: "5.00" })
      }
    })
  })
})
