import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getProductByIdMock,
  getWarehouseByIdMock,
  insertInventoryRowMock,
  buildCreatedInventoryInsertMock,
  validateCreateInventoryEditsMock,
  describeInventoryCreateIssuesMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  getWarehouseByIdMock: vi.fn(),
  insertInventoryRowMock: vi.fn(),
  buildCreatedInventoryInsertMock: vi.fn(),
  validateCreateInventoryEditsMock: vi.fn(),
  describeInventoryCreateIssuesMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getProductById: getProductByIdMock,
  getWarehouseById: getWarehouseByIdMock,
  insertInventoryRow: insertInventoryRowMock,
}))

vi.mock("@builders/domain", () => ({
  buildCreatedInventoryInsert: buildCreatedInventoryInsertMock,
  validateCreateInventoryEdits: validateCreateInventoryEditsMock,
  describeInventoryCreateIssues: describeInventoryCreateIssuesMock,
}))

import { createInventoryUseCase } from "../../../src/flooring/inventory/create-inventory.js"
import { InventoryExecutionError } from "../../../src/flooring/inventory/errors.js"

function input(overrides: Record<string, unknown> = {}) {
  return {
    productId: "p-1",
    warehouseId: "wh-1",
    rollNumber: "R-2",
    dyeLot: "DYE-9",
    note: "n",
    startingStock: "100",
    location: "",
    internalNotes: "",
    ...overrides,
  }
}

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
const CREATED_RECORD = { id: "22222222-2222-4222-8222-222222222222", sentinel: true }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getProductByIdMock.mockReset()
  getWarehouseByIdMock.mockReset()
  insertInventoryRowMock.mockReset()
  buildCreatedInventoryInsertMock.mockReset()
  validateCreateInventoryEditsMock.mockReset()
  describeInventoryCreateIssuesMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  validateCreateInventoryEditsMock.mockReturnValue([])
  getProductByIdMock.mockResolvedValue(PRODUCT)
  getWarehouseByIdMock.mockResolvedValue(WAREHOUSE)
  buildCreatedInventoryInsertMock.mockReturnValue(BUILT_FIELDS)
  insertInventoryRowMock.mockResolvedValue(CREATED_RECORD)
  describeInventoryCreateIssuesMock.mockReturnValue("bad")
})

describe("createInventoryUseCase", () => {
  describe("happy path", () => {
    it("reads product + warehouse, builds the insert, and stamps createdAt === fifoReceivedAt", async () => {
      const result = await createInventoryUseCase(input())

      expect(result).toBe(CREATED_RECORD)
      expect(getProductByIdMock).toHaveBeenCalledWith("p-1", expect.anything())
      expect(getWarehouseByIdMock).toHaveBeenCalledWith("wh-1", expect.anything())

      // The product's joined snapshot is flattened before the domain builder.
      expect(buildCreatedInventoryInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          categorySlug: "carpet",
          categoryName: "Carpet",
          stockUnitAbbrev: "SF",
        }),
        input(),
      )

      const insertArg = insertInventoryRowMock.mock.calls[0]![1] as Record<string, unknown>
      expect(insertArg).toMatchObject(BUILT_FIELDS)
      expect(insertArg.createdAt).toBeInstanceOf(Date)
      expect(insertArg.fifoReceivedAt).toBeInstanceOf(Date)
      // Both stamped from one instant so FIFO position matches creation time.
      expect(insertArg.createdAt).toBe(insertArg.fifoReceivedAt)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_VALIDATION_FAILED (422) and reads/inserts nothing on invalid edits", async () => {
      validateCreateInventoryEditsMock.mockReturnValue([{ code: "STARTING_STOCK_REQUIRED" }])

      try {
        await createInventoryUseCase(input({ startingStock: "" }))
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_VALIDATION_FAILED")
        expect(error.status).toBe(422)
      }
      expect(getProductByIdMock).not.toHaveBeenCalled()
      expect(getWarehouseByIdMock).not.toHaveBeenCalled()
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_PRODUCT_NOT_FOUND (404) when the product is missing", async () => {
      getProductByIdMock.mockResolvedValue(null)

      try {
        await createInventoryUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_PRODUCT_NOT_FOUND")
        expect(error.status).toBe(404)
      }
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_WAREHOUSE_NOT_FOUND (404) when the warehouse is missing", async () => {
      getWarehouseByIdMock.mockResolvedValue(null)

      try {
        await createInventoryUseCase(input())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_WAREHOUSE_NOT_FOUND")
        expect(error.status).toBe(404)
      }
      expect(insertInventoryRowMock).not.toHaveBeenCalled()
    })
  })
})
