import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createWorkOrderRecordMock, getWorkOrderDetailByIdMock } =
  vi.hoisted(() => {
    return {
      withDatabaseTransactionMock: vi.fn(),
      createWorkOrderRecordMock: vi.fn(),
      getWorkOrderDetailByIdMock: vi.fn(),
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  createWorkOrderRecord: createWorkOrderRecordMock,
  // Full record read on the pool after the tx commits (the return value).
  getWorkOrderDetailById: getWorkOrderDetailByIdMock,
}))

import { createWorkOrderUseCase } from "../../src/work-orders/create-work-order.js"

const ACTOR = "actor@example.com"

function input(overrides: Record<string, unknown> = {}) {
  return {
    propertyId: null,
    templateId: null,
    jobTypeId: null,
    warehouseId: null,
    ...overrides,
  }
}

function detail(overrides: Record<string, unknown> = {}) {
  return { id: "wo-1", workOrderNumber: "WO-1", createdBy: null, updatedBy: null, ...overrides }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createWorkOrderRecordMock.mockReset()
  getWorkOrderDetailByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // Lean write returns just the id; the pool enrich returns the full record.
  createWorkOrderRecordMock.mockResolvedValue({ id: "wo-1" })
  getWorkOrderDetailByIdMock.mockResolvedValue(detail())
})

describe("createWorkOrderUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(createWorkOrderUseCase(input() as never, "   ")).rejects.toThrowError(/actorEmail/)
    expect(createWorkOrderRecordMock).not.toHaveBeenCalled()
  })

  it("persists the record, stamping createdBy/updatedBy, and returns the pool-enriched record", async () => {
    createWorkOrderRecordMock.mockResolvedValue({ id: "wo-9" })
    const enriched = detail({ id: "wo-9" })
    getWorkOrderDetailByIdMock.mockResolvedValue(enriched)

    const result = await createWorkOrderUseCase(input() as never, ACTOR)

    expect(result).toBe(enriched)
    expect(createWorkOrderRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: ACTOR, updatedBy: ACTOR }),
      expect.anything(),
    )
    // Enrich reads the full record on the pool by the just-written id.
    expect(getWorkOrderDetailByIdMock).toHaveBeenCalledWith("wo-9", { withNeighbors: false })
  })
})
