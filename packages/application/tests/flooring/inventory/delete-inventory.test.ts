import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockInventoryRowMock,
  getInventoryDeleteStateMock,
  deleteInventoryRecordByIdMock,
  isInventoryDeleteBlockedMock,
  buildInventoryDeleteBlockedMessageMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockInventoryRowMock: vi.fn(),
  getInventoryDeleteStateMock: vi.fn(),
  deleteInventoryRecordByIdMock: vi.fn(),
  isInventoryDeleteBlockedMock: vi.fn(),
  buildInventoryDeleteBlockedMessageMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockInventoryRow: lockInventoryRowMock,
  getInventoryDeleteState: getInventoryDeleteStateMock,
  deleteInventoryRecordById: deleteInventoryRecordByIdMock,
}))

vi.mock("@builders/domain", () => ({
  isInventoryDeleteBlocked: isInventoryDeleteBlockedMock,
  buildInventoryDeleteBlockedMessage: buildInventoryDeleteBlockedMessageMock,
}))

import { deleteInventoryUseCase } from "../../../src/flooring/inventory/delete-inventory.js"
import { InventoryExecutionError } from "../../../src/flooring/inventory/errors.js"

const INVENTORY_ID = "11111111-1111-4111-8111-111111111111"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockInventoryRowMock.mockReset()
  getInventoryDeleteStateMock.mockReset()
  deleteInventoryRecordByIdMock.mockReset()
  isInventoryDeleteBlockedMock.mockReset()
  buildInventoryDeleteBlockedMessageMock.mockReset()

  // withDatabaseTransaction just runs the callback with a fake tx.
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ tx: true }),
  )
  isInventoryDeleteBlockedMock.mockReturnValue(false)
  buildInventoryDeleteBlockedMessageMock.mockReturnValue("blocked")
})

describe("deleteInventoryUseCase", () => {
  describe("happy path", () => {
    it("deletes the inventory row in the transaction (no staged-row cascade — the FK was severed)", async () => {
      getInventoryDeleteStateMock.mockResolvedValue({
        hasInventoryAdjustments: false,
        inventoryAdjustmentsCount: 0,
      })

      const result = await deleteInventoryUseCase(INVENTORY_ID)

      expect(result).toEqual({ ok: true })
      expect(deleteInventoryRecordByIdMock).toHaveBeenCalledWith(INVENTORY_ID, expect.anything())
    })

    it("acquires the FOR UPDATE lock before reading delete state", async () => {
      getInventoryDeleteStateMock.mockResolvedValue({
        hasInventoryAdjustments: false,
        inventoryAdjustmentsCount: 0,
      })

      await deleteInventoryUseCase(INVENTORY_ID)

      const lockOrder = lockInventoryRowMock.mock.invocationCallOrder[0]!
      const readOrder = getInventoryDeleteStateMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(readOrder)
    })
  })

  describe("guards", () => {
    it("throws INVENTORY_NOT_FOUND (404) and deletes nothing when the row is missing", async () => {
      getInventoryDeleteStateMock.mockResolvedValue(null)

      await expect(deleteInventoryUseCase(INVENTORY_ID)).rejects.toMatchObject({
        code: "INVENTORY_NOT_FOUND",
        status: 404,
      })
      expect(deleteInventoryRecordByIdMock).not.toHaveBeenCalled()
    })

    it("throws INVENTORY_IN_USE (409) and deletes nothing when inventory adjustments block the delete", async () => {
      getInventoryDeleteStateMock.mockResolvedValue({
        hasInventoryAdjustments: true,
        inventoryAdjustmentsCount: 3,
      })
      isInventoryDeleteBlockedMock.mockReturnValue(true)

      try {
        await deleteInventoryUseCase(INVENTORY_ID)
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof InventoryExecutionError)) throw error
        expect(error.code).toBe("INVENTORY_IN_USE")
        expect(error.status).toBe(409)
        expect(error.payload).toEqual({ inventoryAdjustmentsCount: 3 })
      }
      expect(deleteInventoryRecordByIdMock).not.toHaveBeenCalled()
    })
  })
})
