import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import {
  createTemplate,
  deleteTemplate,
  deleteTemplateItem,
  deleteTemplateServiceItem,
} from "@/features/flooring/templates/mutations"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringProduct: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    flooringService: {
      findUniqueOrThrow: vi.fn(),
    },
    flooringTemplate: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      delete: vi.fn(),
    },
    flooringTemplateItem: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
    },
    flooringTemplateServiceItem: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

describe("template mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deleteTemplate deletes service items, then material items, then the template itself", async () => {
    const order: string[] = []
    const tx = {
      flooringTemplateServiceItem: { deleteMany: vi.fn().mockImplementation(async () => { order.push("serviceItems") }) },
      flooringTemplateItem: { deleteMany: vi.fn().mockImplementation(async () => { order.push("items") }) },
      flooringTemplate: { delete: vi.fn().mockImplementation(async () => { order.push("template") }) },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<void>) => callback(tx))

    await deleteTemplate("tpl-1")

    expect(order).toEqual(["serviceItems", "items", "template"])
  })

  it("createTemplate resolves default material pricing when unitPrice is omitted", async () => {
    const tx = {
      flooringProduct: {
        findFirst: vi.fn().mockResolvedValue(null),
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
          warehouse: null,
          padProduct: null,
          instructions: null,
          templateNotes: null,
          createdAt: new Date("2026-03-19T00:00:00Z"),
          updatedAt: new Date("2026-03-19T00:00:00Z"),
          _count: { items: 1, serviceItems: 0 },
        }),
      },
      flooringTemplateItem: { create: vi.fn().mockResolvedValue({}) },
      flooringTemplateServiceItem: { create: vi.fn().mockResolvedValue({}) },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    await createTemplate({
      propertyId: "prop-1",
      templateTag: "Turn",
      warehouseId: null,
      instructions: null,
      templateNotes: null,
      padProductId: null,
      items: [{ productId: "prod-1", quantity: decimal("2"), unitPrice: null, notes: null }],
      serviceItems: [],
    })

    expect(tx.flooringTemplateItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ unitPrice: decimal("4.25") }),
    })
  })

  it("createTemplate resolves service name and baseCost when serviceId is present and unitPrice is omitted", async () => {
    const tx = {
      flooringProduct: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
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
          warehouse: null,
          padProduct: null,
          instructions: null,
          templateNotes: null,
          createdAt: new Date("2026-03-19T00:00:00Z"),
          updatedAt: new Date("2026-03-19T00:00:00Z"),
          _count: { items: 0, serviceItems: 1 },
        }),
      },
      flooringTemplateItem: { create: vi.fn().mockResolvedValue({}) },
      flooringTemplateServiceItem: { create: vi.fn().mockResolvedValue({}) },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    await createTemplate({
      propertyId: "prop-1",
      templateTag: "Turn",
      warehouseId: null,
      instructions: null,
      templateNotes: null,
      padProductId: null,
      items: [],
      serviceItems: [{ serviceId: "svc-1", name: null, unitId: "unit-1", quantity: decimal("1"), unitPrice: null, notes: null }],
    })

    expect(tx.flooringTemplateServiceItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceId: "svc-1",
        name: "Install",
        unitPrice: decimal("9.50"),
      }),
    })
  })

  it("ensurePadProduct rejects non-pad products through createTemplate", async () => {
    const tx = {
      flooringProduct: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
      },
      flooringService: { findUniqueOrThrow: vi.fn() },
      flooringTemplate: { create: vi.fn(), findUniqueOrThrow: vi.fn() },
      flooringTemplateItem: { create: vi.fn() },
      flooringTemplateServiceItem: { create: vi.fn() },
    }

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) => callback(tx))

    await expect(
      createTemplate({
        propertyId: "prop-1",
        templateTag: "Turn",
        warehouseId: null,
        instructions: null,
        templateNotes: null,
        padProductId: "prod-1",
        items: [],
        serviceItems: [],
      }),
    ).rejects.toMatchObject({
      message: "padProductId must reference a Pad product",
      field: "padProductId",
    })
  })

  it("deleting a child template item does not delete the parent template", async () => {
    await deleteTemplateItem("item-1")

    expect(prismaMock.flooringTemplateItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } })
    expect(prismaMock.flooringTemplate.delete).not.toHaveBeenCalled()
  })

  it("deleting a child template service item does not delete the parent template", async () => {
    await deleteTemplateServiceItem("svc-item-1")

    expect(prismaMock.flooringTemplateServiceItem.delete).toHaveBeenCalledWith({ where: { id: "svc-item-1" } })
    expect(prismaMock.flooringTemplate.delete).not.toHaveBeenCalled()
  })
})
