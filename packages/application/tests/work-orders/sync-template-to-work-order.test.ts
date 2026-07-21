import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getTemplateByIdMock,
  createWorkOrderFromTemplateRecordMock,
  getWorkOrderDetailByIdMock,
  listWorkOrderMaterialItemsMock,
  listWorkOrderPlannedPaymentsMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    getTemplateByIdMock: vi.fn(),
    createWorkOrderFromTemplateRecordMock: vi.fn(),
    getWorkOrderDetailByIdMock: vi.fn(),
    listWorkOrderMaterialItemsMock: vi.fn(),
    listWorkOrderPlannedPaymentsMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: class {} },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getTemplateById: getTemplateByIdMock,
  createWorkOrderFromTemplateRecord: createWorkOrderFromTemplateRecordMock,
  // Pool enrich reads after the tx commits (Promise.all on the pool).
  getWorkOrderDetailById: getWorkOrderDetailByIdMock,
  listWorkOrderMaterialItems: listWorkOrderMaterialItemsMock,
  listWorkOrderPlannedPayments: listWorkOrderPlannedPaymentsMock,
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
    plannedPayments: [],
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getTemplateByIdMock.mockReset()
  createWorkOrderFromTemplateRecordMock.mockReset()
  getWorkOrderDetailByIdMock.mockReset()
  listWorkOrderMaterialItemsMock.mockReset()
  listWorkOrderPlannedPaymentsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getTemplateByIdMock.mockResolvedValue(template())
  // Lean write returns just the id; the pool enrich returns the full result.
  createWorkOrderFromTemplateRecordMock.mockResolvedValue({ id: "wo-1" })
  getWorkOrderDetailByIdMock.mockResolvedValue({ id: "wo-1" })
  listWorkOrderMaterialItemsMock.mockResolvedValue([])
  listWorkOrderPlannedPaymentsMock.mockResolvedValue([])
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

  it("carries the template's planned payments 1:1 into the synced work order", async () => {
    getTemplateByIdMock.mockResolvedValue(
      template({
        plannedPayments: [
          {
            id: "tpp-1",
            amount: "250.00",
            direction: "EXPENSE",
            notes: "deposit",
            entityId: "ent-1",
            // Read-only hydration fields must never reach the WO payment row.
            entityName: "Acme",
            entityType: null,
            createdAt: "2026-07-09T00:00:00.000Z",
            updatedAt: "2026-07-09T00:00:00.000Z",
            createdBy: null,
            updatedBy: null,
          },
        ],
      }),
    )
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    const [record] = createWorkOrderFromTemplateRecordMock.mock.calls[0]
    expect(record.plannedPayments).toEqual([
      { amount: "250.00", direction: "EXPENSE", notes: "deposit", entityId: "ent-1" },
    ])
    expect(record.plannedPayments[0]).not.toHaveProperty("entityName")
  })

  it("coalesces a blank planned-payment note to null on sync", async () => {
    getTemplateByIdMock.mockResolvedValue(
      template({
        plannedPayments: [
          {
            id: "tpp-2",
            amount: "10.00",
            direction: "REVENUE",
            notes: "",
            entityId: null,
            entityName: null,
            entityType: null,
            createdAt: "2026-07-09T00:00:00.000Z",
            updatedAt: "2026-07-09T00:00:00.000Z",
            createdBy: null,
            updatedBy: null,
          },
        ],
      }),
    )
    await syncTemplateToWorkOrderUseCase({ templateId: "tpl-1" }, ACTOR)
    const [record] = createWorkOrderFromTemplateRecordMock.mock.calls[0]
    expect(record.plannedPayments).toEqual([
      { amount: "10.00", direction: "REVENUE", notes: null, entityId: null },
    ])
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
