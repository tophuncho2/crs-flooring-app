import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updateWorkOrderRecordMock, getWorkOrderDetailByIdMock } =
  vi.hoisted(() => {
    return {
      withDatabaseTransactionMock: vi.fn(),
      updateWorkOrderRecordMock: vi.fn(),
      getWorkOrderDetailByIdMock: vi.fn(),
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: class {} },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updateWorkOrderRecord: updateWorkOrderRecordMock,
  // Full record read on the pool after the tx commits (the return value).
  getWorkOrderDetailById: getWorkOrderDetailByIdMock,
}))

import { updateWorkOrderUseCase } from "../../src/work-orders/update-work-order.js"

const ACTOR = "actor@example.com"

function detail(overrides: Record<string, unknown> = {}) {
  return { id: "wo-1", workOrderNumber: "WO-1", createdBy: null, updatedBy: null, ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updateWorkOrderRecordMock.mockReset()
  getWorkOrderDetailByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // Lean write returns just the id; the pool enrich returns the full record.
  updateWorkOrderRecordMock.mockResolvedValue({ id: "wo-1" })
  getWorkOrderDetailByIdMock.mockResolvedValue(detail())
})

describe("updateWorkOrderUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(updateWorkOrderUseCase("wo-1", {} as never, "   ")).rejects.toThrowError(/actorEmail/)
    expect(updateWorkOrderRecordMock).not.toHaveBeenCalled()
  })

  it("persists the update, stamping updatedBy only, and returns the pool-enriched record", async () => {
    const enriched = detail({ updatedBy: ACTOR })
    getWorkOrderDetailByIdMock.mockResolvedValue(enriched)

    const result = await updateWorkOrderUseCase("wo-1", { unitType: "3BR" } as never, ACTOR)

    expect(result).toBe(enriched)
    expect(updateWorkOrderRecordMock).toHaveBeenCalledWith(
      "wo-1",
      expect.objectContaining({ unitType: "3BR", updatedBy: ACTOR }),
      expect.anything(),
    )
    // createdBy is immutable on update — never stamped here.
    expect(updateWorkOrderRecordMock.mock.calls[0]![1]).not.toHaveProperty("createdBy")
  })
})
