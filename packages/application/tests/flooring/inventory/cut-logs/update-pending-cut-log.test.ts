import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  dbWomiFindUniqueMock,
  getPendingCutLogWithInventoryForMutationMock,
  lockInventoryForCutLogMock,
  updatePendingCutLogRowMock,
  recomputeAndPersistTotalCutSumsMock,
  assertCutLogExpectedUpdatedAtMatchesMock,
  assertCutLogLinkMutationAllowedMock,
  assertCutLogLinkageSymmetryMock,
  assertCutLogPendingMutationAllowedMock,
  assertCutSumWithinStartingStockMock,
  deriveCutLogCoverageCutStringMock,
  describeCutLogPendingFormIssuesMock,
  validateCutLogPendingFormMock,
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
    dbWomiFindUniqueMock: vi.fn(),
    getPendingCutLogWithInventoryForMutationMock: vi.fn(),
    lockInventoryForCutLogMock: vi.fn(),
    updatePendingCutLogRowMock: vi.fn(),
    recomputeAndPersistTotalCutSumsMock: vi.fn(),
    assertCutLogExpectedUpdatedAtMatchesMock: vi.fn(),
    assertCutLogLinkMutationAllowedMock: vi.fn(),
    assertCutLogLinkageSymmetryMock: vi.fn(),
    assertCutLogPendingMutationAllowedMock: vi.fn(),
    assertCutSumWithinStartingStockMock: vi.fn(),
    deriveCutLogCoverageCutStringMock: vi.fn(),
    describeCutLogPendingFormIssuesMock: vi.fn(),
    validateCutLogPendingFormMock: vi.fn(),
    CutLogDomainErrorClass: CutLogDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  db: { flooringWorkOrderItem: { findUnique: dbWomiFindUniqueMock } },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getPendingCutLogWithInventoryForMutation: getPendingCutLogWithInventoryForMutationMock,
  lockInventoryForCutLog: lockInventoryForCutLogMock,
  updatePendingCutLogRow: updatePendingCutLogRowMock,
  recomputeAndPersistTotalCutSums: recomputeAndPersistTotalCutSumsMock,
}))

vi.mock("@builders/domain", () => ({
  CutLogDomainError: CutLogDomainErrorClass,
  assertCutLogExpectedUpdatedAtMatches: assertCutLogExpectedUpdatedAtMatchesMock,
  assertCutLogLinkMutationAllowed: assertCutLogLinkMutationAllowedMock,
  assertCutLogLinkageSymmetry: assertCutLogLinkageSymmetryMock,
  assertCutLogPendingMutationAllowed: assertCutLogPendingMutationAllowedMock,
  assertCutSumWithinStartingStock: assertCutSumWithinStartingStockMock,
  deriveCutLogCoverageCutString: deriveCutLogCoverageCutStringMock,
  describeCutLogPendingFormIssues: describeCutLogPendingFormIssuesMock,
  validateCutLogPendingForm: validateCutLogPendingFormMock,
}))

import { updatePendingCutLogUseCase } from "../../../../src/flooring/inventory/cut-logs/update-pending-cut-log.js"
import { CutLogExecutionError } from "../../../../src/flooring/inventory/cut-logs/errors.js"

const WO_ID = "10000000-0000-4000-8000-000000000001"
const CUT_LOG_ID = "40000000-0000-4000-8000-000000000004"
const INVENTORY_ID = "30000000-0000-4000-8000-000000000003"
const WAREHOUSE_ID = "wh-1"
const PRODUCT_ID = "prod-1"
const NEW_WO = "10000000-0000-4000-8000-00000000000a"
const NEW_WOMI = "20000000-0000-4000-8000-00000000000b"
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
    cut: "5",
    isWaste: false,
    notes: "",
    warehouseId: WAREHOUSE_ID,
    productId: PRODUCT_ID,
    ...overrides,
  }
}

function inventoryRow(overrides: Record<string, unknown> = {}) {
  return {
    coveragePerUnit: "2.50",
    categorySlug: "vinyl-plank",
    location: "A1",
    startingStock: "100.00",
    stockUnitAbbrev: "sf",
    ...overrides,
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    scope: { kind: "work-order" as const, workOrderId: WO_ID },
    cutLogId: CUT_LOG_ID,
    expectedUpdatedAt: UPDATED_AT,
    patch: {},
    ...overrides,
  }
}

function found(over: { cutLog?: Record<string, unknown>; inventory?: Record<string, unknown> } = {}) {
  return { cutLog: existingRow(over.cutLog), inventory: inventoryRow(over.inventory) }
}

const UPDATED = { id: CUT_LOG_ID, cut: "3.00" }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  dbWomiFindUniqueMock.mockReset()
  getPendingCutLogWithInventoryForMutationMock.mockReset()
  lockInventoryForCutLogMock.mockReset()
  updatePendingCutLogRowMock.mockReset()
  recomputeAndPersistTotalCutSumsMock.mockReset()
  assertCutLogExpectedUpdatedAtMatchesMock.mockReset()
  assertCutLogLinkMutationAllowedMock.mockReset()
  assertCutLogLinkageSymmetryMock.mockReset()
  assertCutLogPendingMutationAllowedMock.mockReset()
  assertCutSumWithinStartingStockMock.mockReset()
  deriveCutLogCoverageCutStringMock.mockReset()
  describeCutLogPendingFormIssuesMock.mockReset()
  validateCutLogPendingFormMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  dbWomiFindUniqueMock.mockResolvedValue({
    id: NEW_WOMI,
    workOrderId: NEW_WO,
    productId: PRODUCT_ID,
    workOrder: { warehouseId: WAREHOUSE_ID },
  })
  getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(found())
  assertCutLogExpectedUpdatedAtMatchesMock.mockReturnValue(undefined)
  assertCutLogLinkMutationAllowedMock.mockReturnValue(undefined)
  assertCutLogLinkageSymmetryMock.mockReturnValue(undefined)
  assertCutLogPendingMutationAllowedMock.mockReturnValue(undefined)
  assertCutSumWithinStartingStockMock.mockReturnValue(undefined)
  deriveCutLogCoverageCutStringMock.mockReturnValue("12.50")
  validateCutLogPendingFormMock.mockReturnValue([])
  updatePendingCutLogRowMock.mockResolvedValue(UPDATED)
  recomputeAndPersistTotalCutSumsMock.mockResolvedValue([
    { inventoryId: INVENTORY_ID, totalCutSum: "5.00" },
  ])
})

describe("updatePendingCutLogUseCase", () => {
  describe("happy path", () => {
    it("re-derives coverageCut when cut changes, re-snaps location, recomputes, and returns", async () => {
      const result = await updatePendingCutLogUseCase(input({ patch: { cut: "3" } }))

      expect(result).toEqual({ cutLog: UPDATED, inventoryId: INVENTORY_ID, totalCutSum: "5.00" })
      expect(deriveCutLogCoverageCutStringMock).toHaveBeenCalledWith({
        cut: "3",
        coveragePerUnit: "2.50",
        categorySlug: "vinyl-plank",
      })
      expect(updatePendingCutLogRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: CUT_LOG_ID, patch: { cut: "3", coverageCut: "12.50", location: "A1" } },
      )
    })

    it("re-links to a new WOMI after resolving the target via the top-level db client", async () => {
      await updatePendingCutLogUseCase(
        input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
      )

      expect(dbWomiFindUniqueMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: NEW_WOMI } }),
      )
      expect(updatePendingCutLogRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: CUT_LOG_ID, patch: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI, location: "A1" } },
      )
    })

    it("always re-snaps location even on a non-cut field patch", async () => {
      await updatePendingCutLogUseCase(input({ patch: { isWaste: true } }))

      expect(deriveCutLogCoverageCutStringMock).not.toHaveBeenCalled()
      expect(updatePendingCutLogRowMock).toHaveBeenCalledWith(
        { tx: true },
        { id: CUT_LOG_ID, patch: { isWaste: true, location: "A1" } },
      )
    })
  })

  describe("guards", () => {
    it("throws CUT_LOG_NOT_FOUND (404) when the cut log is missing", async () => {
      getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(null)

      await expect(
        updatePendingCutLogUseCase(input({ patch: { cut: "3" } })),
      ).rejects.toMatchObject({ code: "CUT_LOG_NOT_FOUND", status: 404 })
      expect(updatePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_NOT_PENDING (409) when a field patch hits a finalized row", async () => {
      getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(
        found({ cutLog: { status: "FINAL", isFinal: true } }),
      )
      assertCutLogPendingMutationAllowedMock.mockImplementation(() => {
        throw new CutLogDomainErrorClass("CUT_LOG_PENDING_INPUT_NOT_ALLOWED")
      })

      await expect(
        updatePendingCutLogUseCase(input({ patch: { cut: "3" } })),
      ).rejects.toMatchObject({ code: "CUT_LOG_NOT_PENDING", status: 409 })
      expect(updatePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_LINK_NOT_ALLOWED (409) when a link patch hits a voided row", async () => {
      assertCutLogLinkMutationAllowedMock.mockImplementation(() => {
        throw new CutLogDomainErrorClass("CUT_LOG_LINK_NOT_ALLOWED")
      })

      await expect(
        updatePendingCutLogUseCase(
          input({ patch: { link: { workOrderId: null, workOrderItemId: null } } }),
        ),
      ).rejects.toMatchObject({ code: "CUT_LOG_LINK_NOT_ALLOWED", status: 409 })
      expect(updatePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_STALE (409) when the OCC token does not match", async () => {
      assertCutLogExpectedUpdatedAtMatchesMock.mockImplementation(() => {
        throw new CutLogDomainErrorClass("CUT_LOG_STALE_UPDATED_AT")
      })

      await expect(
        updatePendingCutLogUseCase(input({ patch: { cut: "3" } })),
      ).rejects.toMatchObject({ code: "CUT_LOG_STALE", status: 409 })
      expect(updatePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("translates the totalCutSum invariant breach into CUT_LOG_EXCEEDS_INVENTORY (400)", async () => {
      assertCutSumWithinStartingStockMock.mockImplementation(() => {
        throw new CutLogDomainErrorClass("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK")
      })

      await expect(
        updatePendingCutLogUseCase(input({ patch: { cut: "3" } })),
      ).rejects.toMatchObject({ code: "CUT_LOG_EXCEEDS_INVENTORY", status: 400 })
    })
  })

  describe("re-link scope guards", () => {
    it("throws CUT_LOG_LINK_SCOPE_MISMATCH (400) when the target WO is in another warehouse", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: NEW_WO,
        productId: PRODUCT_ID,
        workOrder: { warehouseId: "wh-other" },
      })

      await expect(
        updatePendingCutLogUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "CUT_LOG_LINK_SCOPE_MISMATCH", status: 400 })
      expect(updatePendingCutLogRowMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_LINK_SCOPE_MISMATCH (400) when the target WOMI is for another product", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: NEW_WO,
        productId: "prod-other",
        workOrder: { warehouseId: WAREHOUSE_ID },
      })

      await expect(
        updatePendingCutLogUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "CUT_LOG_LINK_SCOPE_MISMATCH", status: 400 })
    })

    it("throws CUT_LOG_NOT_FOUND (404) pre-transaction when the re-link target is missing", async () => {
      dbWomiFindUniqueMock.mockResolvedValue(null)

      await expect(
        updatePendingCutLogUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "CUT_LOG_NOT_FOUND", status: 404 })
      // Pre-TX failure — the transaction is never opened.
      expect(getPendingCutLogWithInventoryForMutationMock).not.toHaveBeenCalled()
    })

    it("throws CUT_LOG_SCOPE_MISMATCH (400) when the target WOMI belongs to another WO", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: "wo-other",
        productId: PRODUCT_ID,
        workOrder: { warehouseId: WAREHOUSE_ID },
      })

      await expect(
        updatePendingCutLogUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "CUT_LOG_SCOPE_MISMATCH", status: 400 })
    })

    it("throws CUT_LOG_LINK_SCOPE_MISMATCH (400) when the target WO has no warehouse", async () => {
      dbWomiFindUniqueMock.mockResolvedValue({
        id: NEW_WOMI,
        workOrderId: NEW_WO,
        productId: PRODUCT_ID,
        workOrder: { warehouseId: null },
      })

      await expect(
        updatePendingCutLogUseCase(
          input({ patch: { link: { workOrderId: NEW_WO, workOrderItemId: NEW_WOMI } } }),
        ),
      ).rejects.toMatchObject({ code: "CUT_LOG_LINK_SCOPE_MISMATCH", status: 400 })
    })
  })

  it("throws CUT_LOG_SCOPE_MISMATCH (400) when the row belongs to another work order (real scope guard)", async () => {
    getPendingCutLogWithInventoryForMutationMock.mockResolvedValue(
      found({ cutLog: { workOrderId: "wo-other" } }),
    )

    try {
      await updatePendingCutLogUseCase(input({ patch: { cut: "3" } }))
      expect.fail("Expected throw")
    } catch (error) {
      if (!(error instanceof CutLogExecutionError)) throw error
      expect(error.code).toBe("CUT_LOG_SCOPE_MISMATCH")
      expect(error.status).toBe(400)
    }
    expect(updatePendingCutLogRowMock).not.toHaveBeenCalled()
  })
})
