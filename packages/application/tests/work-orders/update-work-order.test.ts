import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updateWorkOrderRecordMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    updateWorkOrderRecordMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: class {} },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updateWorkOrderRecord: updateWorkOrderRecordMock,
}))

import { updateWorkOrderUseCase } from "../../src/work-orders/update-work-order.js"

const ACTOR = "actor@example.com"

function detail(overrides: Record<string, unknown> = {}) {
  return { id: "wo-1", workOrderNumber: "WO-1", createdBy: null, updatedBy: null, ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updateWorkOrderRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  updateWorkOrderRecordMock.mockResolvedValue(detail())
})

describe("updateWorkOrderUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(updateWorkOrderUseCase("wo-1", {} as never, "   ")).rejects.toThrowError(/actorEmail/)
    expect(updateWorkOrderRecordMock).not.toHaveBeenCalled()
  })

  it("persists the update, stamping updatedBy only, and returns it", async () => {
    const updated = detail({ updatedBy: ACTOR })
    updateWorkOrderRecordMock.mockResolvedValue(updated)

    const result = await updateWorkOrderUseCase("wo-1", { unitType: "3BR" } as never, ACTOR)

    expect(result).toBe(updated)
    expect(updateWorkOrderRecordMock).toHaveBeenCalledWith(
      "wo-1",
      expect.objectContaining({ unitType: "3BR", updatedBy: ACTOR }),
      expect.anything(),
    )
    // createdBy is immutable on update — never stamped here.
    expect(updateWorkOrderRecordMock.mock.calls[0]![1]).not.toHaveProperty("createdBy")
  })
})
