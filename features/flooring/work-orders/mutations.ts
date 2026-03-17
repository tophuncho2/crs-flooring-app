import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { snapshotTemplateLinesToWorkOrderLines } from "@/features/flooring/templates/services"
import { calculateWorkOrderTotal, normalizeWorkOrder, normalizeWorkOrderItem, normalizeWorkOrderServiceItem } from "./services"
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderMaterialItemInput,
  WorkOrderServiceItemInput,
} from "./validators"

const workOrderInclude = {
  property: {
    select: {
      id: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
    },
  },
  warehouse: {
    select: { id: true, name: true },
  },
  _count: {
    select: { items: true, serviceItems: true },
  },
  analytics: {
    select: {
      totalMaterialCost: true,
      totalServiceCost: true,
      totalCost: true,
    },
  },
} as const

async function resolveWorkOrderProperty(input: CreateWorkOrderInput, tx: Prisma.TransactionClient) {
  if (input.propertyId) {
    return input.propertyId
  }

  if (!input.templateId) {
    throw { message: "propertyId is required when templateId is not provided", field: "propertyId" }
  }

  const template = await tx.flooringTemplate.findUniqueOrThrow({
    where: { id: input.templateId },
    select: { propertyId: true },
  })

  return template.propertyId
}

async function resolveMaterialUnitPrice(item: WorkOrderMaterialItemInput) {
  if (item.unitPrice) {
    return item.unitPrice
  }

  const product = await prisma.flooringProduct.findUnique({
    where: { id: item.productId },
    select: { cost: true },
  })

  return product?.cost ?? "0"
}

async function resolveServiceNameAndPrice(item: WorkOrderServiceItemInput) {
  if (!item.serviceId) {
    return {
      name: item.name ?? "Custom Service",
      unitPrice: item.unitPrice ?? "0",
    }
  }

  const service = await prisma.flooringService.findUniqueOrThrow({
    where: { id: item.serviceId },
    select: { name: true, baseCost: true },
  })

  return {
    name: item.name ?? service.name,
    unitPrice: item.unitPrice ?? service.baseCost,
  }
}

export async function syncWorkOrderAnalytics(tx: Prisma.TransactionClient, workOrderId: string) {
  const [items, serviceItems] = await Promise.all([
    tx.flooringWorkOrderItem.findMany({
      where: { workOrderId },
      select: { quantity: true, unitPrice: true },
    }),
    tx.flooringWorkOrderServiceItem.findMany({
      where: { workOrderId },
      select: { quantity: true, unitPrice: true },
    }),
  ])

  const totals = calculateWorkOrderTotal({
    items: items.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
    serviceItems: serviceItems.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  })

  await tx.flooringAnalytics.upsert({
    where: { workOrderId },
    create: {
      workOrderId,
      totalMaterialCost: totals.materialTotal,
      totalServiceCost: totals.serviceTotal,
      totalCost: totals.total,
    },
    update: {
      totalMaterialCost: totals.materialTotal,
      totalServiceCost: totals.serviceTotal,
      totalCost: totals.total,
    },
  })
}

async function snapshotTemplate(templateId: string, tx: Prisma.TransactionClient) {
  const [items, serviceItems] = await Promise.all([
    tx.flooringTemplateItem.findMany({
      where: { templateId },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        notes: true,
      },
    }),
    tx.flooringTemplateServiceItem.findMany({
      where: { templateId },
      select: {
        serviceId: true,
        name: true,
        unitId: true,
        quantity: true,
        unitPrice: true,
        notes: true,
      },
    }),
  ])

  return {
    items: snapshotTemplateLinesToWorkOrderLines(
      items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes,
      })),
    ),
    serviceItems: snapshotTemplateLinesToWorkOrderLines(
      serviceItems.map((item) => ({
        serviceId: item.serviceId,
        name: item.name,
        unitId: item.unitId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes,
      })),
    ),
  }
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const workOrder = await prisma.$transaction(async (tx) => {
    const propertyId = await resolveWorkOrderProperty(input, tx)
    const templateSnapshot = input.templateId ? await snapshotTemplate(input.templateId, tx) : { items: [], serviceItems: [] }
    const workOrder = await tx.flooringWorkOrder.create({
      data: {
        propertyId,
        templateId: input.templateId,
        warehouseId: input.warehouseId,
        status: input.status,
        vacancy: input.vacancy,
        scheduledFor: input.scheduledFor,
        unitLabel: input.unitLabel,
        unitNumber: input.unitNumber,
        unitType: input.unitType,
        customAddress: input.customAddress,
        instructions: input.instructions,
        notes: input.notes,
        googleDriveSlip: input.googleDriveSlip,
        googleDocUrl: input.googleDocUrl,
      },
      include: workOrderInclude,
    })

    const materialItems =
      input.templateId && input.items.length === 0
        ? templateSnapshot.items
        : await Promise.all(
            input.items.map(async (item) => ({
              productId: item.productId,
              linkedInventoryId: item.linkedInventoryId,
              quantity: item.quantity,
              unitPrice: await resolveMaterialUnitPrice(item),
              notes: item.notes,
              changeOrderStatus: item.changeOrderStatus,
            })),
          )

    for (const item of materialItems) {
      await tx.flooringWorkOrderItem.create({
        data: {
          workOrderId: workOrder.id,
          productId: item.productId,
          linkedInventoryId: "linkedInventoryId" in item ? item.linkedInventoryId : null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          changeOrderStatus: "changeOrderStatus" in item ? item.changeOrderStatus : "SUFFICIENT",
        },
      })
    }

    const serviceItems =
      input.templateId && input.serviceItems.length === 0
        ? templateSnapshot.serviceItems
        : await Promise.all(
            input.serviceItems.map(async (item) => {
              const resolved = await resolveServiceNameAndPrice(item)
              return {
                serviceId: item.serviceId,
                name: resolved.name,
                unitId: item.unitId,
                quantity: item.quantity,
                unitPrice: resolved.unitPrice,
                notes: item.notes,
              }
            }),
          )

    for (const item of serviceItems) {
      await tx.flooringWorkOrderServiceItem.create({
        data: {
          workOrderId: workOrder.id,
          serviceId: item.serviceId,
          name: item.name,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        },
      })
    }

    await syncWorkOrderAnalytics(tx, workOrder.id)

    return tx.flooringWorkOrder.findUniqueOrThrow({
      where: { id: workOrder.id },
      include: workOrderInclude,
    })
  })

  return normalizeWorkOrder(workOrder)
}

export async function updateWorkOrder(id: string, input: UpdateWorkOrderInput) {
  const data: Prisma.FlooringWorkOrderUncheckedUpdateInput = {}

  if (input.propertyId !== undefined) data.propertyId = input.propertyId
  if (input.templateId !== undefined) data.templateId = input.templateId
  if (input.warehouseId !== undefined) data.warehouseId = input.warehouseId
  if (input.status !== undefined) data.status = input.status
  if (input.vacancy !== undefined) data.vacancy = input.vacancy
  if (input.scheduledFor !== undefined) data.scheduledFor = input.scheduledFor
  if (input.unitLabel !== undefined) data.unitLabel = input.unitLabel
  if (input.unitNumber !== undefined) data.unitNumber = input.unitNumber
  if (input.unitType !== undefined) data.unitType = input.unitType
  if (input.customAddress !== undefined) data.customAddress = input.customAddress
  if (input.instructions !== undefined) data.instructions = input.instructions
  if (input.notes !== undefined) data.notes = input.notes
  if (input.googleDriveSlip !== undefined) data.googleDriveSlip = input.googleDriveSlip
  if (input.googleDocUrl !== undefined) data.googleDocUrl = input.googleDocUrl

  const workOrder = await prisma.flooringWorkOrder.update({
    where: { id },
    data,
    include: workOrderInclude,
  })

  return normalizeWorkOrder(workOrder)
}

export async function deleteWorkOrder(id: string) {
  await prisma.flooringWorkOrder.delete({ where: { id } })
}

export async function createWorkOrderItem(workOrderId: string, input: WorkOrderMaterialItemInput) {
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.flooringWorkOrderItem.create({
      data: {
        workOrderId,
        productId: input.productId,
        linkedInventoryId: input.linkedInventoryId,
        quantity: input.quantity,
        unitPrice: await resolveMaterialUnitPrice(input),
        notes: input.notes,
        changeOrderStatus: input.changeOrderStatus,
      },
      include: {
        product: {
          select: {
            manufacturerName: true,
            style: true,
            color: true,
            category: { select: { sendUnit: { select: { name: true } } } },
          },
        },
        linkedInventory: {
          select: {
            itemNumber: true,
            dyeLot: true,
            location: {
              select: {
                locationCode: true,
                warehouse: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    await syncWorkOrderAnalytics(tx, workOrderId)
    return item
  })

  return normalizeWorkOrderItem(created)
}

export async function updateWorkOrderItem(itemId: string, input: Partial<WorkOrderMaterialItemInput>) {
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.flooringWorkOrderItem.update({
      where: { id: itemId },
      data: {
        productId: input.productId,
        linkedInventoryId: input.linkedInventoryId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? undefined,
        notes: input.notes,
        changeOrderStatus: input.changeOrderStatus,
      },
      include: {
        product: {
          select: {
            manufacturerName: true,
            style: true,
            color: true,
            category: { select: { sendUnit: { select: { name: true } } } },
          },
        },
        linkedInventory: {
          select: {
            itemNumber: true,
            dyeLot: true,
            location: {
              select: {
                locationCode: true,
                warehouse: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    await syncWorkOrderAnalytics(tx, item.workOrderId)
    return item
  })

  return normalizeWorkOrderItem(updated)
}

export async function deleteWorkOrderItem(itemId: string) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.flooringWorkOrderItem.findUniqueOrThrow({
      where: { id: itemId },
      select: { workOrderId: true },
    })

    await tx.flooringWorkOrderItem.delete({ where: { id: itemId } })
    await syncWorkOrderAnalytics(tx, existing.workOrderId)
  })
}

export async function createWorkOrderServiceItem(workOrderId: string, input: WorkOrderServiceItemInput) {
  const resolved = await resolveServiceNameAndPrice(input)
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.flooringWorkOrderServiceItem.create({
      data: {
        workOrderId,
        serviceId: input.serviceId,
        name: resolved.name,
        unitId: input.unitId,
        quantity: input.quantity,
        unitPrice: resolved.unitPrice,
        notes: input.notes,
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    await syncWorkOrderAnalytics(tx, workOrderId)
    return item
  })

  return normalizeWorkOrderServiceItem(created)
}

export async function updateWorkOrderServiceItem(itemId: string, input: Partial<WorkOrderServiceItemInput>) {
  const service = input.serviceId
    ? await prisma.flooringService.findUnique({
        where: { id: input.serviceId },
        select: { name: true, baseCost: true },
      })
    : null

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.flooringWorkOrderServiceItem.update({
      where: { id: itemId },
      data: {
        serviceId: input.serviceId,
        name: input.name ?? service?.name,
        unitId: input.unitId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? service?.baseCost ?? undefined,
        notes: input.notes,
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    await syncWorkOrderAnalytics(tx, item.workOrderId)
    return item
  })

  return normalizeWorkOrderServiceItem(updated)
}

export async function deleteWorkOrderServiceItem(itemId: string) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.flooringWorkOrderServiceItem.findUniqueOrThrow({
      where: { id: itemId },
      select: { workOrderId: true },
    })

    await tx.flooringWorkOrderServiceItem.delete({ where: { id: itemId } })
    await syncWorkOrderAnalytics(tx, existing.workOrderId)
  })
}
