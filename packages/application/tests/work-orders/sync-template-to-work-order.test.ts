import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getTemplateByIdMock,
  createWorkOrderFromTemplateRecordMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    getTemplateByIdMock: vi.fn(),
    createWorkOrderFromTemplateRecordMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: class {} },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getTemplateById: getTemplateByIdMock,
  createWorkOrderFromTemplateRecord: createWorkOrderFromTemplateRecordMock,
}))

import { syncTemplateToWorkOrderUseCase } from "../../src/work-orders/sync-template-to-work-order.js"

const ACTOR = "actor@example.com"

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: "tpl-1",
    propertyId: null,
    jobTypeId: null,
    warehouseId: null,
    unitType: "2BR",
    propertyStreetAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyPostalCode: "",
    customerName: null,
    description: null,
    installerInstructions: null,
    plannedProducts: [],
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getTemplateByIdMock.mockReset()
  createWorkOrderFromTemplateRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getTemplateByIdMock.mockResolvedValue(template())
  createWorkOrderFromTemplateRecordMock.mockResolvedValue({ workOrder: { id: "wo-1" }, items: [] })
})

describe("syncTemplateToWorkOrderUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(getTemplateByIdMock).not.toHaveBeenCalled()
    expect(createWorkOrderFromTemplateRecordMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail so the work order and items get stamped", async () => {
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    expect(createWorkOrderFromTemplateRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorEmail: ACTOR }),
      expect.anything(),
    )
  })

  it("snapshots the template property's address into the new work order's columns", async () => {
    getTemplateByIdMock.mockResolvedValue(
      template({
        propertyStreetAddress: "123 Main St",
        propertyCity: "Springfield",
        propertyState: "IL",
        propertyPostalCode: "62704",
      }),
    )
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    expect(createWorkOrderFromTemplateRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrder: expect.objectContaining({
          streetAddress: "123 Main St",
          city: "Springfield",
          state: "IL",
          postalCode: "62704",
        }),
      }),
      expect.anything(),
    )
  })

  it("carries the template's customer name into the new work order", async () => {
    getTemplateByIdMock.mockResolvedValue(template({ customerName: "Jane Doe" }))
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    expect(createWorkOrderFromTemplateRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrder: expect.objectContaining({ customerName: "Jane Doe" }),
      }),
      expect.anything(),
    )
  })

  it("leaves the customer name null when the template has none", async () => {
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    expect(createWorkOrderFromTemplateRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrder: expect.objectContaining({ customerName: null }),
      }),
      expect.anything(),
    )
  })

  it("does NOT carry a planned product's cost into the synced work order items", async () => {
    getTemplateByIdMock.mockResolvedValue(
      template({
        plannedProducts: [
          {
            productId: "prod-1",
            quantity: "5",
            unitId: "unit-1",
            notes: "rush",
            // Cost lives on the planned product but must never reach the WO item.
            cost: "10.50",
          },
        ],
      }),
    )
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    const [record] = createWorkOrderFromTemplateRecordMock.mock.calls[0]
    expect(record.items).toEqual([
      { productId: "prod-1", quantity: "5", unitId: "unit-1", notes: "rush" },
    ])
    expect(record.items[0]).not.toHaveProperty("cost")
  })

  it("leaves the address columns null when the template has no property address", async () => {
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    expect(createWorkOrderFromTemplateRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrder: expect.objectContaining({
          streetAddress: null,
          city: null,
          state: null,
          postalCode: null,
        }),
      }),
      expect.anything(),
    )
  })
})
