import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getInventoryRowsForMergeMock,
  getProductByIdMock,
  getWarehouseByIdMock,
  insertInventoryRowMock,
  lockInventoryRowMock,
  markInventoryRowsMergedMock,
  assertMergeSourcesMock,
  sumMergedStartingStockMock,
  buildCreatedInventoryInsertMock,
  validateCreateInventoryEditsMock,
  describeInventoryCreateIssuesMock,
  MockInventoryDomainError,
} = vi.hoisted(() => {
  class MockInventoryDomainError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.name = "InventoryDomainError"
      this.code = code
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    getInventoryRowsForMergeMock: vi.fn(),
    getProductByIdMock: vi.fn(),
    getWarehouseByIdMock: vi.fn(),
    insertInventoryRowMock: vi.fn(),
    lockInventoryRowMock: vi.fn(),
    markInventoryRowsMergedMock: vi.fn(),
    assertMergeSourcesMock: vi.fn(),
    sumMergedStartingStockMock: vi.fn(),
    buildCreatedInventoryInsertMock: vi.fn(),
    validateCreateInventoryEditsMock: vi.fn(),
    describeInventoryCreateIssuesMock: vi.fn(),
    MockInventoryDomainError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getInventoryRowsForMerge: getInventoryRowsForMergeMock,
  getProductById: getProductByIdMock,
  getWarehouseById: getWarehouseByIdMock,
  insertInventoryRow: insertInventoryRowMock,
  lockInventoryRow: lockInventoryRowMock,
  markInventoryRowsMerged: markInventoryRowsMergedMock,
}))

vi.mock("@builders/domain", () => ({
  assertMergeSources: assertMergeSourcesMock,
  sumMergedStartingStock: sumMergedStartingStockMock,
  buildCreatedInventoryInsert: buildCreatedInventoryInsertMock,
  validateCreateInventoryEdits: validateCreateInventoryEditsMock,
  describeInventoryCreateIssues: describeInventoryCreateIssuesMock,
  InventoryDomainError: MockInventoryDomainError,
}))

import { mergeInventoryUseCase } from "../../../src/flooring/inventory/merge-inventory.js"
import { InventoryExecutionError } from "../../../src/flooring/inventory/errors.js"

function input(overrides: Record<string, unknown> = {}) {
  return {
    productId: "p-1",
    warehouseId: "wh-1",
    // Deliberately out of order + duplicated to exercise dedupe + sorted locking.
    sourceInventoryIds: ["inv-2", "inv-1", "inv-2", "inv-3"],
    rollNumber: "R-9",
    dyeLot: "",
    note: "merged",
    location: "",
    internalNotes: "",
    ...overrides,
  }
}

const SOURCES = [
  { id: "inv-1", productId: "p-1", warehouseId: "wh-1", startingStock: "100", netDeducted: "25" },
  { id: "inv-2", productId: "p-1", warehouseId: "wh-2", startingStock: "50", netDeducted: "0" },
  { id: "inv-3", productId: "p-1", warehouseId: "wh-1", startingStock: "50", netDeducted: "0" },
]
const PRODUCT = {
  id: "p-1",
  stockUnitName: "Square Feet",
  stockUnitAbbrev: "SF",
  sendUnitName: "Linear Feet",
  sendUnitAbbrev: "LF",
  category: { slug: "carpet", name: "Carpet" },
}
const WAREHOUSE = { id: "wh-1", name: "Main" }
const BUILT_FIELDS = { productId: "p-1", netDeducted: "0", isArchived: false }
const CREATED_RECORD = { id: "33333333-3333-4333-8333-333333333333", sentinel: true }

beforeEach(() => {
  vi.clearAllMocks()
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  lockInventoryRowMock.mockResolvedValue(undefined)
  getInventoryRowsForMergeMock.mockResolvedValue(SOURCES)
  assertMergeSourcesMock.mockReturnValue(undefined)
  getProductByIdMock.mockResolvedValue(PRODUCT)
  getWarehouseByIdMock.mockResolvedValue(WAREHOUSE)
  sumMergedStartingStockMock.mockReturnValue("175.00")
  validateCreateInventoryEditsMock.mockReturnValue([])
  buildCreatedInventoryInsertMock.mockReturnValue(BUILT_FIELDS)
  insertInventoryRowMock.mockResolvedValue(CREATED_RECORD)
  markInventoryRowsMergedMock.mockResolvedValue(3)
  describeInventoryCreateIssuesMock.mockReturnValue("bad")
})

describe("mergeInventoryUseCase", () => {
  describe("happy path", () => {
    it("locks each de-duped source in sorted order, inserts the merged row, and flags the sources", async () => {
      const result = await mergeInventoryUseCase(input())

      expect(result).toBe(CREATED_RECORD)

      // De-duped (inv-2 once) + sorted ascending.
      const lockedIds = lockInventoryRowMock.mock.calls.map((call) => call[1])
      expect(lockedIds).toEqual(["inv-1", "inv-2", "inv-3"])
      expect(getInventoryRowsForMergeMock).toHaveBeenCalledWith(
        ["inv-1", "inv-2", "inv-3"],
        expect.anything(),
      )

      // Single-product invariant checked against the locked rows.
      expect(assertMergeSourcesMock).toHaveBeenCalledWith(SOURCES, "p-1")

      // Server-computed starting stock flows into the insert build (NOT client-supplied).
      expect(buildCreatedInventoryInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ categorySlug: "carpet", stockUnitAbbrev: "SF" }),
        expect.objectContaining({ startingStock: "175.00", productId: "p-1", warehouseId: "wh-1" }),
      )

      const insertArg = insertInventoryRowMock.mock.calls[0]![1] as Record<string, unknown>
      expect(insertArg).toMatchObject(BUILT_FIELDS)
      expect(insertArg.createdAt).toBe(insertArg.fifoReceivedAt)

      // Sources flagged wasMerged in the same transaction (tx first, ids second).
      expect(markInventoryRowsMergedMock).toHaveBeenCalledWith(expect.anything(), [
        "inv-1",
        "inv-2",
        "inv-3",
      ])
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_MERGE_CROSS_PRODUCT (422) and never inserts or flags on a cross-product set", async () => {
      assertMergeSourcesMock.mockImplementation(() => {
        throw new MockInventoryDomainError("INVENTORY_MERGE_CROSS_PRODUCT", "mixed products")
      })

      try {
        await mergeInventoryUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_MERGE_CROSS_PRODUCT")
        expect(error.status).toBe(422)
      }
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
      expect(markInventoryRowsMergedMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_MERGE_TOO_FEW_SOURCES (422) when the rule rejects the count", async () => {
      assertMergeSourcesMock.mockImplementation(() => {
        throw new MockInventoryDomainError("INVENTORY_MERGE_TOO_FEW_SOURCES", "need 2")
      })

      try {
        await mergeInventoryUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_MERGE_TOO_FEW_SOURCES")
        expect(error.status).toBe(422)
      }
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_NOT_FOUND (404) when a requested row is missing, before asserting product", async () => {
      // Only 2 of the 3 distinct ids resolve.
      getInventoryRowsForMergeMock.mockResolvedValue([SOURCES[0], SOURCES[1]])

      try {
        await mergeInventoryUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_NOT_FOUND")
        expect(error.status).toBe(404)
      }
      expect(assertMergeSourcesMock).not.toHaveBeenCalled()
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })
  })
})
