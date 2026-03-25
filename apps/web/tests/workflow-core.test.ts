import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@builders/db"
import { getWorkOrderStatusLabel } from "@/features/flooring/work-orders/contracts"
import { calculateTemplateTotal } from "@/features/flooring/templates/services"
import { createTemplate } from "@/features/flooring/templates/mutations"
import { createWorkOrder, deleteWorkOrderItem, deleteWorkOrderServiceItem } from "@/features/flooring/work-orders/mutations"
import { syncTemplateToWorkOrder } from "@/features/flooring/work-orders/domain/syncTemplate"

const { prismaMock, getWorkOrderByIdMock, getWorkOrderByIdWithClientMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringProduct: { findFirst: vi.fn(), findUnique: vi.fn() },
    flooringService: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
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

describe("workflow core", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWorkOrderByIdWithClientMock.mockResolvedValue({ id: "wo-1", templateId: "tpl-1", warehouseId: "wh-1", instructions: "Template instructions" })
  })

  it("creates templates inside one transaction and resolves default prices through the transaction client", async () => {
    const tx = {
      flooringProduct: {
        findFirst: vi.fn().mockResolvedValue({ id: "pad-1" }),
        findUnique: vi.fn().mockResolvedValue({ cost: decimal("4.25") }),
      },
      flooringService: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ name: "Install", baseCost: decimal("9.50") }),
      },
      flooringTemplate: {
        create: vi.fn().mockResolvedValue({ id: "tpl-1" }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "tpl-1",
          templateNumber: "TP-00001",
          templateTag: "Turn",
          propertyId: "prop-1",
          property: { id: "prop-1", name: "Oak" },
          warehouse: { id: "wh-1", name: "Main" },
          padProduct: null,
          _count: { items: 1, serviceItems: 1 },
          instructions: "Install",
          templateNotes: null,
          createdAt: new Date("2026-03-18T00:00:00Z"),
          updatedAt: new Date("2026-03-18T00:00:00Z"),
        }),
      },
      flooringTemplateItem: { create: vi.fn().mockResolvedValue({}) },
      flooringTemplateServiceItem: { create: vi.fn().mockResolvedValue({}) },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    const template = await createTemplate({
      propertyId: "prop-1",
      templateTag: "Turn",
      warehouseId: "wh-1",
      instructions: "Install",
      templateNotes: null,
      padProductId: "pad-1",
      items: [
        {
          productId: "prod-1",
          quantity: decimal("2"),
          unitPrice: null,
          notes: null,
        },
      ],
      serviceItems: [
        {
          serviceId: "svc-1",
          name: null,
          unitId: "unit-1",
          quantity: decimal("1"),
          unitPrice: null,
          notes: null,
        },
      ],
    })

    expect(tx.flooringProduct.findUnique).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      select: { cost: true },
    })
    expect(tx.flooringTemplateItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitPrice: decimal("4.25") }),
      }),
    )
    expect(tx.flooringTemplateServiceItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Install", unitPrice: decimal("9.50") }),
      }),
    )
    expect(template.itemsCount).toBe(2)
  })

  it("creates a work order from a template snapshot and copies header fields plus child rows", async () => {
    const tx = {
      flooringTemplate: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValueOnce({ propertyId: "prop-1" })
          .mockResolvedValueOnce({
            id: "tpl-1",
            propertyId: "prop-1",
            warehouseId: "wh-1",
            instructions: "Template instructions",
            items: [
              { id: "tpl-item-1", productId: "prod-1", quantity: decimal("2"), unitPrice: decimal("4.00"), notes: "material" },
            ],
            serviceItems: [
              { id: "tpl-svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("9.00"), notes: null },
            ],
          }),
      },
      flooringTemplateItem: {
        findMany: vi.fn(),
      },
      flooringTemplateServiceItem: {
        findMany: vi.fn(),
      },
      flooringService: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ name: "Install", baseCost: decimal("9.00") }),
      },
      flooringWorkOrder: {
        create: vi.fn().mockResolvedValue({ id: "wo-1" }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "wo-1",
          workOrderNumber: "WO-00001",
          propertyId: "prop-1",
          templateId: "tpl-1",
          property: {
            id: "prop-1",
            name: "Oak",
            streetAddress: null,
            city: null,
            state: null,
            postalCode: null,
          },
          warehouse: { id: "wh-1", name: "Main" },
          status: "BUILDING_ORDER",
          isComplete: false,
          vacancy: null,
          scheduledFor: null,
          unitLabel: null,
          unitType: null,
          customAddress: null,
          instructions: "Template instructions",
          notes: null,
          googleDriveSlip: null,
          googleDocUrl: null,
          createdAt: new Date("2026-03-18T00:00:00Z"),
          updatedAt: new Date("2026-03-18T00:00:00Z"),
          _count: { items: 1, serviceItems: 1 },
          hasShortage: false,
        }),
      },
      flooringWorkOrderItem: { create: vi.fn().mockResolvedValue({}) },
      flooringWorkOrderServiceItem: { create: vi.fn().mockResolvedValue({}) },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    const workOrder = await createWorkOrder({
      propertyId: null,
      templateId: "tpl-1",
      warehouseId: null,
      status: "BUILDING_ORDER",
      isComplete: false,
      vacancy: null,
      scheduledFor: null,
      unitLabel: null,
      unitType: null,
      customAddress: null,
      instructions: null,
      notes: null,
      googleDriveSlip: null,
      googleDocUrl: null,
      items: [],
      serviceItems: [],
    })

    expect(tx.flooringWorkOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          propertyId: "prop-1",
          templateId: "tpl-1",
          warehouseId: "wh-1",
          instructions: "Template instructions",
        }),
      }),
    )
    expect(tx.flooringWorkOrderItem.create).toHaveBeenCalledTimes(1)
    expect(tx.flooringWorkOrderServiceItem.create).toHaveBeenCalledTimes(1)
    expect(workOrder.templateId).toBe("tpl-1")
  })

  it("syncs a template into a work order, updates header snapshot fields, and returns preview metadata", async () => {
    const tx = {
      flooringWorkOrder: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "wo-1",
          propertyId: "prop-1",
          templateId: null,
          warehouseId: null,
          instructions: null,
          isComplete: false,
          updatedAt: new Date("2026-03-18T00:00:00Z"),
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      flooringTemplate: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "tpl-1",
          propertyId: "prop-1",
          warehouseId: "wh-1",
          instructions: "Template instructions",
          items: [{ id: "tpl-item-1", productId: "prod-1", quantity: decimal("2"), unitPrice: decimal("4.00"), notes: null }],
          serviceItems: [{ id: "tpl-svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: decimal("1"), unitPrice: decimal("9.00"), notes: null }],
        }),
      },
      flooringWorkOrderItem: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn(),
      },
      flooringWorkOrderServiceItem: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn(),
      },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))
    getWorkOrderByIdMock.mockResolvedValue({ id: "wo-1", templateId: "tpl-1" })

    const result = await syncTemplateToWorkOrder("wo-1", {
      templateId: "tpl-1",
      mode: "overwrite",
      dryRun: false,
      expectedUpdatedAt: new Date("2026-03-18T00:00:00Z"),
    })

    expect(tx.flooringWorkOrder.update).toHaveBeenCalledWith({
      where: { id: "wo-1" },
      data: expect.objectContaining({
        templateId: "tpl-1",
        warehouseId: "wh-1",
        instructions: "Template instructions",
      }),
    })
    expect(result.headerUpdates).toEqual({
      warehouseId: true,
      instructions: true,
      templateId: true,
    })
    expect(result.policy.headerFields.instructions).toBe("snapshot_from_template_on_sync")
  })

  it("uses derived status ownership for shortage and completion", () => {
    expect(getWorkOrderStatusLabel({ status: "BUILDING_ORDER", isComplete: false, hasShortage: true })).toBe("Shortage")
    expect(getWorkOrderStatusLabel({ status: "BUILDING_ORDER", isComplete: true, hasShortage: true })).toBe("Complete")
  })

  it("calculates totals from one shared summary path", () => {
    expect(
      calculateTemplateTotal({
        items: [{ quantity: 2, unitPrice: 4 }],
        serviceItems: [{ quantity: 1, unitPrice: 9 }],
      }),
    ).toEqual({
      materialTotal: 8,
      serviceTotal: 9,
      total: 17,
    })
  })

  it("deletes work-order rows without extra lookup work", async () => {
    const tx = {
      flooringWorkOrderItem: { delete: vi.fn().mockResolvedValue({}) },
      flooringWorkOrderServiceItem: { delete: vi.fn().mockResolvedValue({}) },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    await deleteWorkOrderItem("item-1")
    await deleteWorkOrderServiceItem("service-1")

    expect(tx.flooringWorkOrderItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } })
    expect(tx.flooringWorkOrderServiceItem.delete).toHaveBeenCalledWith({ where: { id: "service-1" } })
  })
})
