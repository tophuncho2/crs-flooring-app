import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getInventoryByIdMock,
  insertInventoryRowMock,
  buildDuplicatedInventoryInsertMock,
  validateDuplicateInventoryEditsMock,
  describeInventoryDuplicateIssuesMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  getInventoryByIdMock: vi.fn(),
  insertInventoryRowMock: vi.fn(),
  buildDuplicatedInventoryInsertMock: vi.fn(),
  validateDuplicateInventoryEditsMock: vi.fn(),
  describeInventoryDuplicateIssuesMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getInventoryById: getInventoryByIdMock,
  insertInventoryRow: insertInventoryRowMock,
}))

vi.mock("@builders/domain", () => ({
  buildDuplicatedInventoryInsert: buildDuplicatedInventoryInsertMock,
  validateDuplicateInventoryEdits: validateDuplicateInventoryEditsMock,
  describeInventoryDuplicateIssues: describeInventoryDuplicateIssuesMock,
}))

import { duplicateInventoryUseCase } from "../../../src/flooring/inventory/duplicate-inventory.js"
import { InventoryExecutionError } from "../../../src/flooring/inventory/errors.js"

const SOURCE_ID = "11111111-1111-4111-8111-111111111111"

function input(overrides: Record<string, unknown> = {}) {
  return {
    rollNumber: "R-2",
    note: "n",
    startingStock: "100",
    location: "",
    internalNotes: "",
    ...overrides,
  }
}

const SOURCE_ROW = { id: SOURCE_ID, productId: "p-1" }
const BUILT_FIELDS = { productId: "p-1", totalCutSum: "0", isArchived: false }
const CREATED_RECORD = { id: "22222222-2222-4222-8222-222222222222", sentinel: true }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getInventoryByIdMock.mockReset()
  insertInventoryRowMock.mockReset()
  buildDuplicatedInventoryInsertMock.mockReset()
  validateDuplicateInventoryEditsMock.mockReset()
  describeInventoryDuplicateIssuesMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  validateDuplicateInventoryEditsMock.mockReturnValue([])
  getInventoryByIdMock.mockResolvedValue(SOURCE_ROW)
  buildDuplicatedInventoryInsertMock.mockReturnValue(BUILT_FIELDS)
  insertInventoryRowMock.mockResolvedValue(CREATED_RECORD)
  describeInventoryDuplicateIssuesMock.mockReturnValue("bad")
})

describe("duplicateInventoryUseCase", () => {
  describe("happy path", () => {
    it("reads the source, builds the insert, and inserts with fifoReceivedAt now()", async () => {
      const result = await duplicateInventoryUseCase(SOURCE_ID, input())

      expect(result).toBe(CREATED_RECORD)
      expect(getInventoryByIdMock).toHaveBeenCalledWith(SOURCE_ID, expect.anything())
      expect(buildDuplicatedInventoryInsertMock).toHaveBeenCalledWith(SOURCE_ROW, input())

      const insertArg = insertInventoryRowMock.mock.calls[0]![1] as Record<string, unknown>
      expect(insertArg).toMatchObject(BUILT_FIELDS)
      expect(insertArg.fifoReceivedAt).toBeInstanceOf(Date)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_VALIDATION_FAILED (422) and inserts nothing on invalid edits", async () => {
      validateDuplicateInventoryEditsMock.mockReturnValue([{ code: "STARTING_STOCK_REQUIRED" }])

      try {
        await duplicateInventoryUseCase(SOURCE_ID, input({ startingStock: "" }))
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_VALIDATION_FAILED")
        expect(error.status).toBe(422)
      }
      // Validation runs before any read/insert.
      expect(getInventoryByIdMock).not.toHaveBeenCalled()
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_NOT_FOUND (404) when the source row is missing", async () => {
      getInventoryByIdMock.mockResolvedValue(null)

      try {
        await duplicateInventoryUseCase(SOURCE_ID, input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_NOT_FOUND")
        expect(error.status).toBe(404)
      }
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })
  })
})
