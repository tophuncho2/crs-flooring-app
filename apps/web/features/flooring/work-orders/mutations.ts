import { Prisma, prisma } from "@builders/db"
import { createAppError } from "@/server/http/api-helpers"
import { applyTemplateSnapshotToNewWorkOrder, loadTemplateSnapshot } from "@/features/flooring/templates/domain/template-snapshot"
import { buildInvoiceInvalidationFields } from "./invoice-state"
import { normalizeWorkOrder, normalizeWorkOrderItem, normalizeWorkOrderServiceItem } from "./services"
import { normalizeWorkOrderSalesRep } from "./domain/sales-reps"
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderMaterialItemInput,
  WorkOrderSalesRepInput,
  WorkOrderServiceItemInput,
  UpdateWorkOrderSalesRepInput,
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
} as const

async function resolveWorkOrderProperty(input: CreateWorkOrderInput, tx: Prisma.TransactionClient) {
  if (input.templateId) {
    const template = await tx.flooringTemplate.findUniqueOrThrow({
      where: { id: input.templateId },
      select: { propertyId: true },
    })

    if (input.propertyId && input.propertyId !== template.propertyId) {
      throw { message: "templateId must match the selected property", field: "templateId" }
    }

    return template.propertyId
  }

  if (input.propertyId) {
    return input.propertyId
  }
  throw { message: "propertyId is required", field: "propertyId" }
}

async function resolveMaterialUnitPrice(item: WorkOrderMaterialItemInput, tx: Prisma.TransactionClient | typeof prisma) {
  if (item.unitPrice) {
    return item.unitPrice
  }

  const product = await tx.flooringProduct.findUnique({
    where: { id: item.productId },
    select: { cost: true },
  })

  return product?.cost ?? "0"
}

async function resolveServiceNameAndPrice(item: WorkOrderServiceItemInput, tx: Prisma.TransactionClient | typeof prisma) {
  if (!item.serviceId) {
    return {
      name: item.name ?? "Custom Service",
      unitPrice: item.unitPrice ?? "0",
    }
  }

  const service = await tx.flooringService.findUniqueOrThrow({
    where: { id: item.serviceId },
    select: { name: true, baseCost: true },
  })

  return {
    name: item.name ?? service.name,
    unitPrice: item.unitPrice ?? service.baseCost,
  }
}

async function resolveSalesRepContact(input: { contactId: string }, tx: Prisma.TransactionClient | typeof prisma) {
  const contact = await tx.flooringContact.findUniqueOrThrow({
    where: { id: input.contactId },
    select: {
      id: true,
      name: true,
      type: true,
    },
  })

  if (contact.type !== "SALES_REP") {
    throw createAppError("Selected contact must be a Sales Rep", { field: "contactId" })
  }

  return contact
}

async function ensureUniqueWorkOrderSalesRep(
  workOrderId: string,
  contactId: string,
  tx: Prisma.TransactionClient,
  excludeRepId?: string,
) {
  const existing = await tx.flooringWorkOrderSalesRep.findFirst({
    where: {
      workOrderId,
      contactId,
      ...(excludeRepId ? { id: { not: excludeRepId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw createAppError("This sales rep is already assigned to the work order", {
      status: 409,
      field: "contactId",
    })
  }
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const workOrder = await prisma.$transaction(async (tx) => {
    const propertyId = await resolveWorkOrderProperty(input, tx)
    const templateSnapshot = input.templateId ? await loadTemplateSnapshot(input.templateId, tx) : null
    const useTemplateMaterialItems = Boolean(templateSnapshot && input.items.length === 0)
    const useTemplateServiceItems = Boolean(templateSnapshot && input.serviceItems.length === 0)
    const useTemplateSalesReps = Boolean(templateSnapshot)
    const workOrder = await tx.flooringWorkOrder.create({
      data: {
        propertyId,
        templateId: input.templateId,
        warehouseId: templateSnapshot?.warehouseId ?? input.warehouseId,
        status: input.status,
        isComplete: input.isComplete ?? false,
        vacancy: input.vacancy,
        scheduledFor: input.scheduledFor,
        unitLabel: input.unitLabel,
        unitType: templateSnapshot?.unitType ?? null,
        customAddress: input.customAddress,
        instructions: templateSnapshot?.instructions ?? input.instructions,
        notes: input.notes,
        googleDriveSlip: input.googleDriveSlip,
        googleDocUrl: input.googleDocUrl,
        templateSyncedAt: templateSnapshot ? new Date() : null,
        templateSyncMode: templateSnapshot ? "overwrite" : null,
        templateSnapshotHash: templateSnapshot?.hash ?? null,
      },
      include: workOrderInclude,
    })

    if (templateSnapshot && (useTemplateMaterialItems || useTemplateServiceItems)) {
      await applyTemplateSnapshotToNewWorkOrder({
        tx,
        workOrderId: workOrder.id,
        snapshot: templateSnapshot,
        includeMaterialItems: useTemplateMaterialItems,
        includeServiceItems: useTemplateServiceItems,
        includeSalesReps: useTemplateSalesReps,
      })
    }

    const materialItems = await Promise.all(
      input.items.map(async (item) => ({
        productId: item.productId,
        linkedInventoryId: item.linkedInventoryId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? (await resolveMaterialUnitPrice(item, tx)),
        notes: item.notes,
        changeOrderStatus: item.changeOrderStatus,
      })),
    )

    for (const item of materialItems) {
      await tx.flooringWorkOrderItem.create({
        data: {
          workOrderId: workOrder.id,
          linkedInventoryId: item.linkedInventoryId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          changeOrderStatus: item.changeOrderStatus,
        },
      })
    }

    const serviceSourceItems = useTemplateServiceItems ? [] : input.serviceItems

    const serviceItems = await Promise.all(
      serviceSourceItems.map(async (item) => {
        const resolved =
          item.unitPrice !== null && item.unitPrice !== undefined && "name" in item
            ? { name: item.name ?? "Custom Service", unitPrice: item.unitPrice }
            : await resolveServiceNameAndPrice(item as WorkOrderServiceItemInput, tx)
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
  if (input.isComplete !== undefined) data.isComplete = input.isComplete
  if (input.vacancy !== undefined) data.vacancy = input.vacancy
  if (input.scheduledFor !== undefined) data.scheduledFor = input.scheduledFor
  if (input.unitLabel !== undefined) data.unitLabel = input.unitLabel
  if (input.customAddress !== undefined) data.customAddress = input.customAddress
  if (input.instructions !== undefined) data.instructions = input.instructions
  if (input.notes !== undefined) data.notes = input.notes
  if (input.googleDriveSlip !== undefined) data.googleDriveSlip = input.googleDriveSlip
  if (input.googleDocUrl !== undefined) data.googleDocUrl = input.googleDocUrl

  if (Object.keys(data).length > 0) {
    Object.assign(data, buildInvoiceInvalidationFields())
  }

  const workOrder = await prisma.flooringWorkOrder.update({
    where: { id },
    data,
    include: workOrderInclude,
  })

  return normalizeWorkOrder(workOrder)
}

export async function deleteWorkOrder(id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.flooringWorkOrderSalesRep.deleteMany({ where: { workOrderId: id } })
    await tx.flooringWorkOrderServiceItem.deleteMany({ where: { workOrderId: id } })
    await tx.flooringWorkOrderItem.deleteMany({ where: { workOrderId: id } })
    await tx.flooringAnalytics.deleteMany({ where: { workOrderId: id } })
    await tx.flooringWorkOrder.delete({ where: { id } })
  })
}

export async function createWorkOrderItem(workOrderId: string, input: WorkOrderMaterialItemInput) {
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.flooringWorkOrderItem.create({
      data: {
        workOrderId,
        productId: input.productId,
        linkedInventoryId: input.linkedInventoryId,
        quantity: input.quantity,
        unitPrice: await resolveMaterialUnitPrice(input, tx),
        notes: input.notes,
        changeOrderStatus: input.changeOrderStatus,
      },
      include: {
        product: {
          select: {
            name: true,
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

    await tx.flooringWorkOrder.update({
      where: { id: workOrderId },
      data: buildInvoiceInvalidationFields(),
    })

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
            name: true,
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

    await tx.flooringWorkOrder.update({
      where: { id: item.workOrderId },
      data: buildInvoiceInvalidationFields(),
    })

    return item
  })

  return normalizeWorkOrderItem(updated)
}

export async function deleteWorkOrderItem(itemId: string) {
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.flooringWorkOrderItem.delete({
      where: { id: itemId },
      select: { workOrderId: true },
    })
    await tx.flooringWorkOrder.update({
      where: { id: deleted.workOrderId },
      data: buildInvoiceInvalidationFields(),
    })
  })
}

export async function createWorkOrderServiceItem(workOrderId: string, input: WorkOrderServiceItemInput) {
  const created = await prisma.$transaction(async (tx) => {
    const resolved = await resolveServiceNameAndPrice(input, tx)
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

    await tx.flooringWorkOrder.update({
      where: { id: workOrderId },
      data: buildInvoiceInvalidationFields(),
    })

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

    await tx.flooringWorkOrder.update({
      where: { id: item.workOrderId },
      data: buildInvoiceInvalidationFields(),
    })

    return item
  })

  return normalizeWorkOrderServiceItem(updated)
}

export async function deleteWorkOrderServiceItem(itemId: string) {
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.flooringWorkOrderServiceItem.delete({
      where: { id: itemId },
      select: { workOrderId: true },
    })
    await tx.flooringWorkOrder.update({
      where: { id: deleted.workOrderId },
      data: buildInvoiceInvalidationFields(),
    })
  })
}

export async function createWorkOrderSalesRep(workOrderId: string, input: WorkOrderSalesRepInput) {
  const created = await prisma.$transaction(async (tx) => {
    const contact = await resolveSalesRepContact(input, tx)
    await ensureUniqueWorkOrderSalesRep(workOrderId, contact.id, tx)

    const item = await tx.flooringWorkOrderSalesRep.create({
      data: {
        workOrderId,
        contactId: contact.id,
        percent: input.percent,
      },
      include: {
        contact: {
          select: {
            name: true,
          },
        },
      },
    })

    return item
  })

  return normalizeWorkOrderSalesRep(created)
}

export async function updateWorkOrderSalesRep(repId: string, input: UpdateWorkOrderSalesRepInput) {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.flooringWorkOrderSalesRep.findUniqueOrThrow({
      where: { id: repId },
      select: {
        workOrderId: true,
      },
    })
    const contact = input.contactId ? await resolveSalesRepContact({ contactId: input.contactId }, tx) : null
    if (contact) {
      await ensureUniqueWorkOrderSalesRep(current.workOrderId, contact.id, tx, repId)
    }

    const item = await tx.flooringWorkOrderSalesRep.update({
      where: { id: repId },
      data: {
        contactId: input.contactId,
        percent: input.percent,
      },
      include: {
        contact: {
          select: {
            name: true,
          },
        },
      },
    })

    return contact
      ? {
          ...item,
          contact: {
            name: contact.name,
          },
        }
      : item
  })

  return normalizeWorkOrderSalesRep(updated)
}

export async function deleteWorkOrderSalesRep(repId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.flooringWorkOrderSalesRep.delete({ where: { id: repId } })
  })
}
