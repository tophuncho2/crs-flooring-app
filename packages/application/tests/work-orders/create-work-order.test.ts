import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createWorkOrderRecordMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    createWorkOrderRecordMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  createWorkOrderRecord: createWorkOrderRecordMock,
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

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createWorkOrderRecordMock.mockResolvedValue(detail())
})

describe("createWorkOrderUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(createWorkOrderUseCase(input() as never, "   ")).rejects.toThrowError(/actorEmail/)
    expect(createWorkOrderRecordMock).not.toHaveBeenCalled()
  })

  it("persists the record, stamping createdBy/updatedBy, and returns it", async () => {
    const created = detail({ id: "wo-9" })
    createWorkOrderRecordMock.mockResolvedValue(created)

    const result = await createWorkOrderUseCase(input() as never, ACTOR)

    expect(result).toBe(created)
    expect(createWorkOrderRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: ACTOR, updatedBy: ACTOR }),
      expect.anything(),
    )
  })
})
