import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryRowMock,
  getInventoryMutableStateByIdMock,
  updateInventoryRecordMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockInventoryRowMock: vi.fn(),
  getInventoryMutableStateByIdMock: vi.fn(),
  updateInventoryRecordMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryRow: lockInventoryRowMock,
  // Lean, relation-free in-transaction read (existence + editable text fields).
  getInventoryMutableStateById: getInventoryMutableStateByIdMock,
  updateInventoryRecord: updateInventoryRecordMock,
}))

import { updateInventoryUseCase } from "../../src/inventory/update-inventory.js"
import { InventoryExecutionError } from "../../src/inventory/errors.js"

const INVENTORY_ID = "11111111-1111-4111-8111-111111111111"
const ACTOR = "actor@example.com"

// Only the columns the lean in-tx read (`getInventoryMutableStateById`) returns.
function currentState(overrides: Record<string, unknown> = {}) {
  return {
    location: "A1",
    internalNotes: "i",
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryRowMock.mockReset()
  getInventoryMutableStateByIdMock.mockReset()
  updateInventoryRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  getInventoryMutableStateByIdMock.mockResolvedValue(currentState())
  updateInventoryRecordMock.mockResolvedValue({ id: INVENTORY_ID })
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
      const result = await updateInventoryUseCase(INVENTORY_ID, { location: "B2" }, ACTOR)

      // Returns a lean { id } — the route reads the full detail at its boundary.
      expect(result).toEqual({ id: INVENTORY_ID })
      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { location: "B2", updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("trims an empty-string patch to null", async () => {
      await updateInventoryUseCase(INVENTORY_ID, { location: "   " }, ACTOR)

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { location: null, updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("stamps updatedBy even when no other fields are patched", async () => {
      await updateInventoryUseCase(INVENTORY_ID, {}, ACTOR)

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("passes through the isArchived toggle", async () => {
      await updateInventoryUseCase(INVENTORY_ID, { isArchived: true }, ACTOR)

      expect(updateInventoryRecordMock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { isArchived: true, updatedBy: ACTOR },
        expect.anything(),
      )
    })

    it("acquires the FOR UPDATE lock before the in-transaction read", async () => {
      await updateInventoryUseCase(INVENTORY_ID, { location: "X" }, ACTOR)

      const lockOrder = lockInventoryRowMock.mock.invocationCallOrder[0]!
      const readOrder = getInventoryMutableStateByIdMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(readOrder)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_NOT_FOUND (404) and writes nothing when the row is missing", async () => {
      getInventoryMutableStateByIdMock.mockResolvedValue(null)

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
