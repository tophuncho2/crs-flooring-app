import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryRowMock,
  getInventoryByIdMock,
  updateInventoryRecordMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockInventoryRowMock: vi.fn(),
  getInventoryByIdMock: vi.fn(),
  updateInventoryRecordMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryRow: lockInventoryRowMock,
  getInventoryById: getInventoryByIdMock,
  updateInventoryRecord: updateInventoryRecordMock,
}))

import { updateInventoryUseCase } from "../../../src/flooring/inventory/update-inventory.js"
import { InventoryExecutionError } from "../../../src/flooring/inventory/errors.js"

const INVENTORY_ID = "11111111-1111-4111-8111-111111111111"
const ACTOR = "actor@example.com"

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

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  updateInventoryRecordMock.mockResolvedValue(UPDATED_RECORD)
})

describe("updateInventoryUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      updateInventoryUseCase(INVENTORY_ID, { location: "B2" }, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(updateInventoryRecordMock).not.toHaveBeenCalled()
    expect(lockInventoryRowMock).not.toHaveBeenCalled()
  })

  describe("happy path", () => {
    it("writes only the touched fields, stamping updatedBy", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      const result = await updateInventoryUseCase(INVENTORY_ID, { location: "B2" }, ACTOR)

      expect(result).toBe(UPDATED_RECORD)
      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { location: "B2", updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("trims an empty-string patch to null", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, { location: "   " }, ACTOR)

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { location: null, updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("stamps updatedBy even when no other fields are patched", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, {}, ACTOR)

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("passes through the isArchived toggle", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, { isArchived: true }, ACTOR)

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { isArchived: true, updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("acquires the FOR UPDATE lock before reading the row", async () => {
      getInventoryByIdMock.mockResolvedValue(currentRow())

      await updateInventoryUseCase(INVENTORY_ID, { location: "X" }, ACTOR)

      const lockOrder = lockInventoryRowMock.mock.invocationCallOrder[0]!
      const readOrder = getInventoryByIdMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(readOrder)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_NOT_FOUND (404) and writes nothing when the row is missing", async () => {
      getInventoryByIdMock.mockResolvedValue(null)

      try {
        await updateInventoryUseCase(INVENTORY_ID, { location: "X" }, ACTOR)
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
