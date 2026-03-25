import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@builders/db"
import { TEMPLATE_SYNC_POLICY } from "@/features/flooring/work-orders/contracts"
import { syncTemplateToWorkOrder } from "@/features/flooring/work-orders/domain/syncTemplate"

const { prismaMock, getWorkOrderByIdMock, getWorkOrderByIdWithClientMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
  getWorkOrderByIdMock: vi.fn(),
  getWorkOrderByIdWithClientMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/features/flooring/work-orders/queries", () => ({
  getWorkOrderById: getWorkOrderByIdMock,
  getWorkOrderByIdWithClient: getWorkOrderByIdWithClientMock,
}))

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function buildTx(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    flooringWorkOrder: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "wo-1",
        propertyId: "prop-1",
        templateId: null,
        warehouseId: null,
        instructions: null,
        isComplete: false,
        updatedAt: new Date("2026-03-19T00:00:00Z"),
      }),
      update: vi.fn().mockResolvedValue({}),
    },
      flooringTemplate: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "tpl-1",
          propertyId: "prop-1",
          warehouseId: "wh-1",
          instructions: "Template instructions",
          items: [
            { id: "tpl-item-1", productId: "prod-1", quantity: decimal("2"), unitPrice: decimal("4.00"), notes: null },
          ],
          serviceItems: [
            { id: "tpl-svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("9.00"), notes: null },
          ],
        }),
      },
    flooringWorkOrderItem: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    flooringWorkOrderServiceItem: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides,
  }
}

describe("template sync domain", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWorkOrderByIdMock.mockResolvedValue({ id: "wo-1", templateId: "tpl-1", warehouseId: "wh-1", instructions: "Template instructions" })
    getWorkOrderByIdWithClientMock.mockResolvedValue({ id: "wo-1", templateId: "tpl-1", warehouseId: "wh-1", instructions: "Template instructions" })
  })

  it("blocks sync for completed work orders", async () => {
    const tx = buildTx({
      flooringWorkOrder: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "wo-1",
          propertyId: "prop-1",
          templateId: null,
          warehouseId: null,
          instructions: null,
          isComplete: true,
          updatedAt: new Date("2026-03-19T00:00:00Z"),
        }),
        update: vi.fn(),
      },
    })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    await expect(
      syncTemplateToWorkOrder("wo-1", {
        templateId: "tpl-1",
        mode: "overwrite",
        dryRun: false,
        expectedUpdatedAt: null,
      }),
    ).rejects.toMatchObject({
      message: "Completed work orders cannot sync templates",
      field: "isComplete",
    })
  })

  it("returns a conflict when expectedUpdatedAt is stale", async () => {
    const tx = buildTx()
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    await expect(
      syncTemplateToWorkOrder("wo-1", {
        templateId: "tpl-1",
        mode: "overwrite",
        dryRun: false,
        expectedUpdatedAt: new Date("2026-03-18T00:00:00Z"),
      }),
    ).rejects.toMatchObject({
      message: "Work order changed before sync completed. Refresh and try again.",
      field: "updatedAt",
      status: 409,
    })
  })

  it("requires template and work-order properties to match", async () => {
    const tx = buildTx({
      flooringTemplate: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "tpl-2",
          propertyId: "prop-2",
          warehouseId: "wh-1",
          instructions: "Template instructions",
          items: [],
          serviceItems: [],
        }),
      },
    })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    await expect(
      syncTemplateToWorkOrder("wo-1", {
        templateId: "tpl-2",
        mode: "overwrite",
        dryRun: false,
        expectedUpdatedAt: null,
      }),
    ).rejects.toMatchObject({
      message: "Template property must match the selected work order property",
      field: "templateId",
    })
  })

  it("returns overwrite dry-run preview counts without a work-order payload", async () => {
    const tx = buildTx({
      flooringWorkOrderItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-item-1", sourceTemplateItemId: "tpl-item-old", productId: "prod-old", quantity: decimal("1"), unitPrice: decimal("2.00"), notes: "old", changeOrderStatus: "SUFFICIENT" },
        ]),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      flooringWorkOrderServiceItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-svc-1", sourceTemplateServiceItemId: "tpl-svc-old", serviceId: "svc-old", name: "Old Service", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("3.00"), notes: null },
        ]),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    const result = await syncTemplateToWorkOrder("wo-1", {
      templateId: "tpl-1",
      mode: "overwrite",
      dryRun: true,
      expectedUpdatedAt: null,
    })

    expect(result).toEqual({
      mode: "overwrite",
      dryRun: true,
      policy: TEMPLATE_SYNC_POLICY,
      workOrder: null,
      headerUpdates: {
        warehouseId: true,
        instructions: true,
        templateId: true,
      },
      rowsToCreate: {
        materialItems: 1,
        serviceItems: 1,
      },
      rowsToDelete: {
        materialItems: 1,
        serviceItems: 1,
      },
      counts: {
        materialItems: 1,
        serviceItems: 1,
      },
    })
    expect(tx.flooringWorkOrderItem.deleteMany).not.toHaveBeenCalled()
    expect(tx.flooringWorkOrder.update).not.toHaveBeenCalled()
  })

  it("returns append dry-run preview counts without duplicating matching rows", async () => {
    const tx = buildTx({
      flooringTemplate: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "tpl-1",
          propertyId: "prop-1",
          warehouseId: "wh-1",
          instructions: "Template instructions",
          items: [
            { id: "tpl-item-1", productId: "prod-1", quantity: decimal("2"), unitPrice: decimal("4.00"), notes: null },
            { id: "tpl-item-2", productId: "prod-2", quantity: decimal("1"), unitPrice: decimal("6.00"), notes: "extra" },
          ],
          serviceItems: [
            { id: "tpl-svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("9.00"), notes: null },
            { id: "tpl-svc-2", serviceId: "svc-2", name: "Demo", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("5.00"), notes: null },
          ],
        }),
      },
      flooringWorkOrderItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-item-1", sourceTemplateItemId: "tpl-item-1", productId: "prod-1", quantity: decimal("2"), unitPrice: decimal("4.00"), notes: null, changeOrderStatus: "SUFFICIENT" },
        ]),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      flooringWorkOrderServiceItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-svc-1", sourceTemplateServiceItemId: "tpl-svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("9.00"), notes: null },
        ]),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    const result = await syncTemplateToWorkOrder("wo-1", {
      templateId: "tpl-1",
      mode: "append",
      dryRun: true,
      expectedUpdatedAt: null,
    })

    expect(result.rowsToCreate).toEqual({ materialItems: 1, serviceItems: 1 })
    expect(result.rowsToDelete).toEqual({ materialItems: 0, serviceItems: 0 })
    expect(result.counts).toEqual({ materialItems: 2, serviceItems: 2 })
    expect(result.workOrder).toBeNull()
  })

  it("overwrite replaces existing rows, snapshots header fields, and returns work-order metadata", async () => {
    const tx = buildTx({
      flooringWorkOrderItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-item-1", sourceTemplateItemId: "tpl-item-old", productId: "prod-old", quantity: decimal("1"), unitPrice: decimal("2.00"), notes: "old", changeOrderStatus: "SUFFICIENT" },
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
      },
      flooringWorkOrderServiceItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-svc-1", sourceTemplateServiceItemId: "tpl-svc-old", serviceId: "svc-old", name: "Old Service", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("3.00"), notes: null },
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
      },
    })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    const result = await syncTemplateToWorkOrder("wo-1", {
      templateId: "tpl-1",
      mode: "overwrite",
      dryRun: false,
      expectedUpdatedAt: null,
    })

    expect(tx.flooringWorkOrderItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["wo-item-1"] } } })
    expect(tx.flooringWorkOrderServiceItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["wo-svc-1"] } } })
    expect(tx.flooringWorkOrderItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          workOrderId: "wo-1",
          sourceTemplateItemId: "tpl-item-1",
          productId: "prod-1",
          quantity: decimal("2"),
          unitPrice: decimal("4.00"),
          notes: null,
          changeOrderStatus: "SUFFICIENT",
        },
      ],
    })
    expect(tx.flooringWorkOrderServiceItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          workOrderId: "wo-1",
          sourceTemplateServiceItemId: "tpl-svc-1",
          serviceId: "svc-1",
          name: "Install",
          unitId: "unit-1",
          quantity: decimal("1"),
          unitPrice: decimal("9.00"),
          notes: null,
        },
      ],
    })
    expect(tx.flooringWorkOrder.update).toHaveBeenCalledWith({
      where: { id: "wo-1" },
      data: expect.objectContaining({
        templateId: "tpl-1",
        warehouseId: "wh-1",
        instructions: "Template instructions",
      }),
    })
    expect(result.workOrder).toEqual({ id: "wo-1", templateId: "tpl-1", warehouseId: "wh-1", instructions: "Template instructions" })
    expect(result.rowsToDelete).toEqual({ materialItems: 1, serviceItems: 1 })
    expect(result.rowsToCreate).toEqual({ materialItems: 1, serviceItems: 1 })
  })

  it("append adds only missing rows and does not delete or duplicate matching rows", async () => {
    const tx = buildTx({
      flooringTemplate: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "tpl-1",
          propertyId: "prop-1",
          warehouseId: "wh-1",
          instructions: "Template instructions",
          items: [
            { id: "tpl-item-1", productId: "prod-1", quantity: decimal("2"), unitPrice: decimal("4.00"), notes: null },
            { id: "tpl-item-2", productId: "prod-2", quantity: decimal("1"), unitPrice: decimal("6.00"), notes: "extra" },
          ],
          serviceItems: [
            { id: "tpl-svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("9.00"), notes: null },
            { id: "tpl-svc-2", serviceId: "svc-2", name: "Demo", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("5.00"), notes: null },
          ],
        }),
      },
      flooringWorkOrderItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-item-1", sourceTemplateItemId: "tpl-item-1", productId: "prod-1", quantity: decimal("2"), unitPrice: decimal("4.00"), notes: null, changeOrderStatus: "SUFFICIENT" },
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn(),
        update: vi.fn(),
      },
      flooringWorkOrderServiceItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "wo-svc-1", sourceTemplateServiceItemId: "tpl-svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("9.00"), notes: null },
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn(),
        update: vi.fn(),
      },
    })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    const result = await syncTemplateToWorkOrder("wo-1", {
      templateId: "tpl-1",
      mode: "append",
      dryRun: false,
      expectedUpdatedAt: null,
    })

    expect(tx.flooringWorkOrderItem.deleteMany).not.toHaveBeenCalled()
    expect(tx.flooringWorkOrderServiceItem.deleteMany).not.toHaveBeenCalled()
    expect(tx.flooringWorkOrderItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          workOrderId: "wo-1",
          sourceTemplateItemId: "tpl-item-2",
          productId: "prod-2",
          quantity: decimal("1"),
          unitPrice: decimal("6.00"),
          notes: "extra",
          changeOrderStatus: "SUFFICIENT",
        },
      ],
    })
    expect(tx.flooringWorkOrderServiceItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          workOrderId: "wo-1",
          sourceTemplateServiceItemId: "tpl-svc-2",
          serviceId: "svc-2",
          name: "Demo",
          unitId: "unit-1",
          quantity: decimal("1"),
          unitPrice: decimal("5.00"),
          notes: null,
        },
      ],
    })
    expect(result.rowsToCreate).toEqual({ materialItems: 1, serviceItems: 1 })
    expect(result.rowsToDelete).toEqual({ materialItems: 0, serviceItems: 0 })
  })
})
