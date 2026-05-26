import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryRowMock,
  getInventoryByIdMock,
  updateInventoryRecordMock,
  composeInventoryItemMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockInventoryRowMock: vi.fn(),
  getInventoryByIdMock: vi.fn(),
  updateInventoryRecordMock: vi.fn(),
  composeInventoryItemMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryRow: lockInventoryRowMock,
  getInventoryById: getInventoryByIdMock,
  updateInventoryRecord: updateInventoryRecordMock,
}))

vi.mock("@builders/domain", () => ({
  composeInventoryItem: composeInventoryItemMock,
}))

import { updateInventoryUseCase } from "../../../src/flooring/inventory/update-inventory.js"
import { InventoryExecutionError } from "../../../src/flooring/inventory/errors.js"

const INVENTORY_ID = "11111111-1111-4111-8111-111111111111"

// Only the columns the use case reads off `getInventoryById`.
function currentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: INVENTORY_ID,
    inventoryNumber: "INV-5",
    rollPrefix: "ROLL#",
    rollNumber: "R-1",
    dyeLot: "OLD-DYE",
    location: "A1",
    note: "n",
    internalNotes: "i",
    ...overrides,
  }
}

// Sentinel the data-layer write returns; the use case returns it verbatim.
const UPDATED_RECORD = { id: INVENTORY_ID, sentinel: true }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryRowMock.mockReset()
  getInventoryByIdMock.mockReset()
  updateInventoryRecordMock.mockReset()
  composeInventoryItemMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  composeInventoryItemMock.mockReturnValue("COMPOSED")
  updateInventoryRecordMock.mockResolvedValue(UPDATED_RECORD)
})

describe("updateInventoryUseCase", () => {
  describe("happy path", () => {
    it("recomposes inventoryItem from post-patch values and writes only touched fields", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      const result = await updateInventoryUseCase(INVENTORY_ID, { dyeLot: "NEW-DYE" })

      expect(result).toBe(UPDATED_RECORD)
      // Composer fed effective (post-patch) values; rollNumber/note untouched
      // come from current, dyeLot is the patched value. location + internalNotes
      // are NOT part of the inventoryItem formula.
      expect(composeInventoryItemMock).toHaveBeenCalledWith({
        inventoryNumber: "INV-5",
        rollPrefix: "ROLL#",
        rollNumber: "R-1",
        dyeLot: "NEW-DYE",
        note: "n",
      })
      // Write input carries the recomposed item + only the patched key.
      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { inventoryItem: "COMPOSED", dyeLot: "NEW-DYE" },
        expect.anything(),
      )
    })

    it("trims an empty-string patch to null and feeds the composer an empty part", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, { dyeLot: "   " })

      expect(composeInventoryItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ dyeLot: "" }),
      )
      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { inventoryItem: "COMPOSED", dyeLot: null },
        expect.anything(),
      )
    })

    it("leaves untouched fields out of the write input but always writes inventoryItem", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, {})

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { inventoryItem: "COMPOSED" },
        expect.anything(),
      )
    })

    it("treats a current empty-string field as null when no patch is supplied", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow({ note: "" }))

      await updateInventoryUseCase(INVENTORY_ID, {})

      expect(composeInventoryItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ note: "" }),
      )
    })

    it("passes through the isArchived toggle", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, { isArchived: true })

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { inventoryItem: "COMPOSED", isArchived: true },
        expect.anything(),
      )
    })

    it("acquires the FOR UPDATE lock before reading the row", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, { dyeLot: "X" })

      const lockOrder = lockInventoryRowMock.mock.invocationCallOrder[0]!
      const readOrder = getInventoryByIdMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(readOrder)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_NOT_FOUND (404) and writes nothing when the row is missing", async () => {
      getInventoryByIdMock.mockResolvedValue(null)

      try {
        await updateInventoryUseCase(INVENTORY_ID, { dyeLot: "X" })
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_NOT_FOUND")
        expect(error.status).toBe(404)
      }
      expect(updateInventoryRecordMock).not.toHaveBeenCalled()
    })
  })
})
