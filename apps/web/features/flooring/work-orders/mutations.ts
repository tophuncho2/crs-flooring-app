import {
  Prisma,
  clearAllocationsForWorkOrder,
  deleteAllAllocationsForWorkOrderItem,
  listWorkOrderAllocationInventoryIds,
  prisma,
  refreshInventoryReservedStockCounts,
} from "@builders/db"
import {
  applyManualAllocationChangeUseCase,
  reconcileWorkOrderAllocationStatusesUseCase,
  removeWorkOrderItemAllocationUseCase,
} from "@builders/application"
import { collectAffectedReservationInventoryIds } from "@builders/domain"
import { createAppError } from "@/server/http/api-helpers"
import { applyTemplateSnapshotToNewWorkOrder, loadTemplateSnapshot } from "@/features/flooring/templates/domain/template-snapshot"
import { normalizeWorkOrderAllocationApplicationError } from "./application/allocation-errors"
import { normalizeWorkOrder, normalizeWorkOrderItem, normalizeWorkOrderServiceItem } from "./services"
import { normalizeWorkOrderSalesRep } from "./domain/sales-reps"
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderMaterialItemsSectionInput,
  UpdateWorkOrderInput,
  UpdateWorkOrderItemAllocationInput,
  UpdateWorkOrderMaterialSectionInput,
  UpdateWorkOrderSalesRepSectionInput,
  WorkOrderMaterialItemInput,
  WorkOrderSalesRepInput,
  UpdateWorkOrderServiceSectionInput,
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

const workOrderItemInclude = Prisma.validator<Prisma.FlooringWorkOrderItemInclude>()({
  product: {
    select: {
      name: true,
      style: true,
      color: true,
      category: { select: { sendUnit: { select: { name: true } } } },
    },
  },
  allocations: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      inventory: {
        select: {
          itemNumber: true,
          dyeLot: true,
          product: {
            select: {
              category: {
                select: {
                  stockUnit: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          location: {
            select: {
              locationCode: true,
              warehouse: { select: { name: true } },
            },
          },
          importEntry: {
            select: {
              warehouse: { select: { name: true } },
            },
          },
        },
      },
    },
  },
})

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

function assertVersionMatch(actualUpdatedAt: Date, expectedUpdatedAt: string, message: string) {
  if (actualUpdatedAt.toISOString() !== expectedUpdatedAt) {
    throw createAppError(message, {
      status: 409,
      field: "updatedAt",
    })
  }
}

function isNullableStringEqual(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? null) === (right ?? null)
}

function isDateValueEqual(left: Date | null | undefined, right: Date | null | undefined) {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null)
}

function isDecimalValueEqual(
  left: Prisma.Decimal | string | number | null | undefined,
  right: Prisma.Decimal | string | number | null | undefined,
) {
  return String(left ?? "") === String(right ?? "")
}

function applyAllocationUpdatePatch(input: UpdateWorkOrderItemAllocationInput) {
  return {
    ...(input.inventoryId !== undefined ? { inventoryId: input.inventoryId } : {}),
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.cutSize !== undefined ? { cutSize: input.cutSize } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
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
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? (await resolveMaterialUnitPrice(item, tx)),
        notes: item.notes,
      })),
    )

    for (const item of materialItems) {
      await tx.flooringWorkOrderItem.create({
        data: {
          workOrderId: workOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          allocationStatus: "NOT_STARTED",
          changeOrderStatus: "SUFFICIENT",
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
  const workOrder = await prisma.$transaction(async (tx) => {
    const existing = await tx.flooringWorkOrder.findUniqueOrThrow({
      where: { id },
      select: {
        propertyId: true,
        templateId: true,
        warehouseId: true,
        status: true,
        isComplete: true,
        vacancy: true,
        scheduledFor: true,
        unitLabel: true,
        customAddress: true,
        instructions: true,
        notes: true,
        googleDriveSlip: true,
        googleDocUrl: true,
      },
    })

    const data: Prisma.FlooringWorkOrderUncheckedUpdateInput = {}
    let didChange = false

    if (input.propertyId !== undefined && input.propertyId !== existing.propertyId) {
      data.propertyId = input.propertyId
      didChange = true
    }
    if (input.templateId !== undefined && input.templateId !== existing.templateId) {
      data.templateId = input.templateId
      didChange = true
    }
    if (input.warehouseId !== undefined && input.warehouseId !== existing.warehouseId) {
      data.warehouseId = input.warehouseId
      didChange = true
    }
    if (input.status !== undefined && input.status !== existing.status) {
      data.status = input.status
      didChange = true
    }
    if (input.isComplete !== undefined && input.isComplete !== existing.isComplete) {
      data.isComplete = input.isComplete
      didChange = true
    }
    if (input.vacancy !== undefined && input.vacancy !== existing.vacancy) {
      data.vacancy = input.vacancy
      didChange = true
    }
    if (input.scheduledFor !== undefined && !isDateValueEqual(input.scheduledFor, existing.scheduledFor)) {
      data.scheduledFor = input.scheduledFor
      didChange = true
    }
    if (input.unitLabel !== undefined && !isNullableStringEqual(input.unitLabel, existing.unitLabel)) {
      data.unitLabel = input.unitLabel
      didChange = true
    }
    if (input.customAddress !== undefined && !isNullableStringEqual(input.customAddress, existing.customAddress)) {
      data.customAddress = input.customAddress
      didChange = true
    }
    if (input.instructions !== undefined && !isNullableStringEqual(input.instructions, existing.instructions)) {
      data.instructions = input.instructions
      didChange = true
    }
    if (input.notes !== undefined && !isNullableStringEqual(input.notes, existing.notes)) {
      data.notes = input.notes
      didChange = true
    }
    if (input.googleDriveSlip !== undefined && !isNullableStringEqual(input.googleDriveSlip, existing.googleDriveSlip)) {
      data.googleDriveSlip = input.googleDriveSlip
      didChange = true
    }
    if (input.googleDocUrl !== undefined && !isNullableStringEqual(input.googleDocUrl, existing.googleDocUrl)) {
      data.googleDocUrl = input.googleDocUrl
      didChange = true
    }

    if (!didChange) {
      return tx.flooringWorkOrder.findUniqueOrThrow({
        where: { id },
        include: workOrderInclude,
      })
    }

    if (input.warehouseId !== undefined && input.warehouseId !== existing.warehouseId) {
      await clearAllocationsForWorkOrder(id, tx)
    }

    return tx.flooringWorkOrder.update({
      where: { id },
      data,
      include: workOrderInclude,
    })
  })

  return normalizeWorkOrder(workOrder)
}

export async function deleteWorkOrder(id: string) {
  await prisma.$transaction(async (tx) => {
    const affectedInventoryIds = await listWorkOrderAllocationInventoryIds(id, tx)
    await clearAllocationsForWorkOrder(id, tx)
    await refreshInventoryReservedStockCounts(collectAffectedReservationInventoryIds(affectedInventoryIds), tx)
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
        quantity: input.quantity,
        unitPrice: await resolveMaterialUnitPrice(input, tx),
        notes: input.notes,
        allocationStatus: "NOT_STARTED",
        changeOrderStatus: "SUFFICIENT",
      },
      include: workOrderItemInclude,
    })

    await reconcileWorkOrderAllocationStatusesUseCase(workOrderId, tx)

    return item
  })

  return normalizeWorkOrderItem(created)
}

export async function updateWorkOrderItem(itemId: string, input: Partial<WorkOrderMaterialItemInput>) {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.flooringWorkOrderItem.findUniqueOrThrow({
      where: { id: itemId },
      select: {
        workOrderId: true,
        productId: true,
      },
    })

    const touchedInventoryIds = new Set<string>()
    if (input.productId !== undefined && input.productId !== current.productId) {
      const allocationInventoryIds = await tx.flooringWorkOrderItemAllocation.findMany({
        where: { workOrderItemId: itemId },
        select: { inventoryId: true },
      })
      for (const allocation of allocationInventoryIds) {
        touchedInventoryIds.add(allocation.inventoryId)
      }
      await deleteAllAllocationsForWorkOrderItem(itemId, tx)
    }

    const item = await tx.flooringWorkOrderItem.update({
      where: { id: itemId },
      data: {
        productId: input.productId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? undefined,
        notes: input.notes,
        allocationStatus: "NOT_STARTED",
        changeOrderStatus: "SUFFICIENT",
      },
      include: workOrderItemInclude,
    })

    if (touchedInventoryIds.size > 0) {
      await refreshInventoryReservedStockCounts(
        collectAffectedReservationInventoryIds(Array.from(touchedInventoryIds)),
        tx,
      )
    }

    await reconcileWorkOrderAllocationStatusesUseCase(item.workOrderId, tx)

    return tx.flooringWorkOrderItem.findUniqueOrThrow({
      where: { id: itemId },
      include: workOrderItemInclude,
    })
  })

  return normalizeWorkOrderItem(updated)
}

export async function deleteWorkOrderItem(itemId: string) {
  await prisma.$transaction(async (tx) => {
    const affectedInventoryIds = await tx.flooringWorkOrderItemAllocation.findMany({
      where: { workOrderItemId: itemId },
      select: { inventoryId: true },
    })
    await deleteAllAllocationsForWorkOrderItem(itemId, tx)
    await refreshInventoryReservedStockCounts(
      collectAffectedReservationInventoryIds(affectedInventoryIds.map((allocation) => allocation.inventoryId)),
      tx,
    )
    const deleted = await tx.flooringWorkOrderItem.delete({
      where: { id: itemId },
      select: { workOrderId: true },
    })
    await reconcileWorkOrderAllocationStatusesUseCase(deleted.workOrderId, tx)
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

export async function saveWorkOrderServiceItemsSection(
  workOrderId: string,
  input: UpdateWorkOrderServiceSectionInput,
) {
  await prisma.$transaction(async (tx) => {
    const currentItems = await tx.flooringWorkOrderServiceItem.findMany({
      where: { workOrderId },
      select: {
        id: true,
        serviceId: true,
        name: true,
        unitId: true,
        quantity: true,
        unitPrice: true,
        notes: true,
        updatedAt: true,
      },
    })
    const currentItemsById = new Map(currentItems.map((item) => [item.id, item]))
    const seenItemIds = new Set<string>()
    let didChange = currentItems.length !== input.items.length

    for (const row of input.items) {
      const resolved = await resolveServiceNameAndPrice(row.item, tx)

      if (!row.id) {
        await tx.flooringWorkOrderServiceItem.create({
          data: {
            workOrderId,
            serviceId: row.item.serviceId,
            name: resolved.name,
            unitId: row.item.unitId,
            quantity: row.item.quantity,
            unitPrice: resolved.unitPrice,
            notes: row.item.notes,
          },
        })
        didChange = true
        continue
      }

      const current = currentItemsById.get(row.id)
      if (!current) {
        throw createAppError("Service item does not belong to this work order", {
          status: 404,
          field: "id",
        })
      }

      assertVersionMatch(current.updatedAt, row.expectedUpdatedAt ?? "", "Service item changed before save completed. Refresh and try again.")

      const nextServiceId = row.item.serviceId || null
      const nextNotes = row.item.notes || null
      const isUnchanged =
        current.serviceId === nextServiceId &&
        current.name === resolved.name &&
        current.unitId === row.item.unitId &&
        String(current.quantity) === String(row.item.quantity) &&
        String(current.unitPrice) === String(resolved.unitPrice) &&
        (current.notes ?? null) === nextNotes

      seenItemIds.add(row.id)
      if (isUnchanged) {
        continue
      }

      await tx.flooringWorkOrderServiceItem.update({
        where: { id: row.id },
        data: {
          serviceId: nextServiceId,
          name: resolved.name,
          unitId: row.item.unitId,
          quantity: row.item.quantity,
          unitPrice: resolved.unitPrice,
          notes: nextNotes,
        },
      })

      didChange = true
    }

    for (const current of currentItems) {
      if (seenItemIds.has(current.id)) {
        continue
      }

      await tx.flooringWorkOrderServiceItem.delete({ where: { id: current.id } })
      didChange = true
    }

  })
}

export async function saveWorkOrderSalesRepsSection(
  workOrderId: string,
  input: UpdateWorkOrderSalesRepSectionInput,
) {
  await prisma.$transaction(async (tx) => {
    const currentItems = await tx.flooringWorkOrderSalesRep.findMany({
      where: { workOrderId },
      select: {
        id: true,
        contactId: true,
        percent: true,
        updatedAt: true,
      },
    })
    const currentItemsById = new Map(currentItems.map((item) => [item.id, item]))
    const seenItemIds = new Set<string>()
    const seenContactIds = new Set<string>()
    let didChange = currentItems.length !== input.items.length

    for (const row of input.items) {
      if (seenContactIds.has(row.item.contactId)) {
        throw createAppError("Each sales rep can only appear once in the section", {
          status: 409,
          field: "contactId",
        })
      }
      seenContactIds.add(row.item.contactId)

      const contact = await resolveSalesRepContact(row.item, tx)

      if (!row.id) {
        await ensureUniqueWorkOrderSalesRep(workOrderId, contact.id, tx)
        await tx.flooringWorkOrderSalesRep.create({
          data: {
            workOrderId,
            contactId: contact.id,
            percent: row.item.percent,
          },
        })
        didChange = true
        continue
      }

      const current = currentItemsById.get(row.id)
      if (!current) {
        throw createAppError("Sales rep row does not belong to this work order", {
          status: 404,
          field: "id",
        })
      }

      assertVersionMatch(current.updatedAt, row.expectedUpdatedAt ?? "", "Sales rep changed before save completed. Refresh and try again.")
      await ensureUniqueWorkOrderSalesRep(workOrderId, contact.id, tx, row.id)

      seenItemIds.add(row.id)
      if (current.contactId === contact.id && String(current.percent) === String(row.item.percent)) {
        continue
      }

      await tx.flooringWorkOrderSalesRep.update({
        where: { id: row.id },
        data: {
          contactId: contact.id,
          percent: row.item.percent,
        },
      })

      didChange = true
    }

    for (const current of currentItems) {
      if (seenItemIds.has(current.id)) {
        continue
      }

      await tx.flooringWorkOrderSalesRep.delete({ where: { id: current.id } })
      didChange = true
    }

  })
}

export async function saveWorkOrderMaterialItemsSection(
  workOrderId: string,
  input: UpdateWorkOrderMaterialItemsSectionInput,
) {
  try {
    await prisma.$transaction(async (tx) => {
      const currentItems = await tx.flooringWorkOrderItem.findMany({
      where: { workOrderId },
      select: {
        id: true,
        productId: true,
        quantity: true,
        unitPrice: true,
        notes: true,
        updatedAt: true,
        allocations: {
          select: {
            id: true,
            inventoryId: true,
            quantity: true,
            cutSize: true,
            notes: true,
            updatedAt: true,
          },
        },
      },
    })
      const currentItemsById = new Map(currentItems.map((item) => [item.id, item]))
      const seenItemIds = new Set<string>()
      const touchedInventoryIds = new Set<string>()
      let didChange = currentItems.length !== input.items.length

    for (const row of input.items) {
      let nextItemId = row.id
      let existingAllocations = [] as Array<{
        id: string
        inventoryId: string
        quantity: Prisma.Decimal
        cutSize: string | null
        notes: string | null
        updatedAt: Date
      }>
      let itemDidChange = false
      const current = row.id ? currentItemsById.get(row.id) : null
      const resolvedUnitPrice = row.item.unitPrice ?? (await resolveMaterialUnitPrice(row.item, tx))
      const nextNotes = row.item.notes ?? null

      if (!row.id) {
        const created = await tx.flooringWorkOrderItem.create({
          data: {
            workOrderId,
            productId: row.item.productId,
            quantity: row.item.quantity,
            unitPrice: resolvedUnitPrice,
            notes: nextNotes,
            allocationStatus: "NOT_STARTED",
            changeOrderStatus: "SUFFICIENT",
          },
          select: { id: true },
        })
        nextItemId = created.id
        didChange = true
        itemDidChange = true
      } else {
        if (!current) {
          throw createAppError("Material item does not belong to this work order", {
            status: 404,
            field: "id",
          })
        }

        assertVersionMatch(current.updatedAt, row.expectedUpdatedAt ?? "", "Material item changed before save completed. Refresh and try again.")

        const itemIsUnchanged =
          current.productId === row.item.productId &&
          isDecimalValueEqual(current.quantity, row.item.quantity) &&
          isDecimalValueEqual(current.unitPrice, resolvedUnitPrice) &&
          isNullableStringEqual(current.notes, nextNotes)

        if (current.productId !== row.item.productId) {
          for (const allocation of current.allocations) {
            touchedInventoryIds.add(allocation.inventoryId)
          }
          await deleteAllAllocationsForWorkOrderItem(row.id, tx)
          didChange = true
          itemDidChange = true
        } else {
          existingAllocations = current.allocations
        }

        if (!itemIsUnchanged) {
          await tx.flooringWorkOrderItem.update({
            where: { id: row.id },
            data: {
              productId: row.item.productId,
              quantity: row.item.quantity,
              unitPrice: resolvedUnitPrice,
              notes: nextNotes,
              allocationStatus: "NOT_STARTED",
              changeOrderStatus: "SUFFICIENT",
            },
          })

          didChange = true
          itemDidChange = true
        }

        seenItemIds.add(row.id)
      }

      const allocationIdsById = new Map(existingAllocations.map((allocation) => [allocation.id, allocation]))
      const seenAllocationIds = new Set<string>()

      for (const allocation of row.allocations) {
        if (allocation.id) {
          const currentAllocation = allocationIdsById.get(allocation.id)
          if (!currentAllocation) {
            throw createAppError("Allocation does not belong to the selected material item", {
              status: 404,
              field: "allocationId",
            })
          }

          assertVersionMatch(
            currentAllocation.updatedAt,
            allocation.expectedUpdatedAt ?? "",
            "Allocation changed before save completed. Refresh and try again.",
          )

          const allocationIsUnchanged =
            currentAllocation.inventoryId === allocation.input.inventoryId &&
            isDecimalValueEqual(currentAllocation.quantity, allocation.input.quantity) &&
            isNullableStringEqual(currentAllocation.cutSize, allocation.input.cutSize) &&
            isNullableStringEqual(currentAllocation.notes, allocation.input.notes)

          if (!allocationIsUnchanged) {
            const result = await applyManualAllocationChangeUseCase(
              {
                workOrderId,
                workOrderItemId: nextItemId ?? "",
                allocationId: allocation.id,
                inventoryId: allocation.input.inventoryId,
                quantity: allocation.input.quantity,
                cutSize: allocation.input.cutSize,
                notes: allocation.input.notes,
              },
              tx,
            )
            for (const inventoryId of result.touchedInventoryIds) {
              touchedInventoryIds.add(inventoryId)
            }
            didChange = true
            itemDidChange = true
          }

          seenAllocationIds.add(allocation.id)
          continue
        }

        const result = await applyManualAllocationChangeUseCase(
          {
            workOrderId,
            workOrderItemId: nextItemId ?? "",
            inventoryId: allocation.input.inventoryId,
            quantity: allocation.input.quantity,
            cutSize: allocation.input.cutSize,
            notes: allocation.input.notes,
          },
          tx,
        )
        for (const inventoryId of result.touchedInventoryIds) {
          touchedInventoryIds.add(inventoryId)
        }
        didChange = true
        itemDidChange = true
      }

      for (const currentAllocation of existingAllocations) {
        if (seenAllocationIds.has(currentAllocation.id)) {
          continue
        }

        const result = await removeWorkOrderItemAllocationUseCase(
          {
            workOrderId,
            workOrderItemId: nextItemId ?? "",
            allocationId: currentAllocation.id,
          },
          tx,
        )
        for (const inventoryId of result.touchedInventoryIds) {
          touchedInventoryIds.add(inventoryId)
        }
        didChange = true
        itemDidChange = true
      }

      if (!nextItemId) {
        throw createAppError("Material section save failed to resolve the target item", {
          status: 500,
          field: "id",
        })
      }

      seenItemIds.add(nextItemId)
    }

    for (const current of currentItems) {
      if (seenItemIds.has(current.id)) {
        continue
      }

      for (const allocation of current.allocations) {
        touchedInventoryIds.add(allocation.inventoryId)
      }
      await deleteAllAllocationsForWorkOrderItem(current.id, tx)
      await tx.flooringWorkOrderItem.delete({ where: { id: current.id } })
      didChange = true
    }

    if (didChange) {
      await refreshInventoryReservedStockCounts(
        collectAffectedReservationInventoryIds(Array.from(touchedInventoryIds)),
        tx,
      )
      await reconcileWorkOrderAllocationStatusesUseCase(workOrderId, tx)
    }
    })
  } catch (error) {
    normalizeWorkOrderAllocationApplicationError(error)
  }
}

export async function saveWorkOrderMaterialSection(
  workOrderId: string,
  itemId: string,
  input: UpdateWorkOrderMaterialSectionInput,
) {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.flooringWorkOrderItem.findUniqueOrThrow({
      where: { id: itemId },
      select: {
        id: true,
        workOrderId: true,
        productId: true,
        updatedAt: true,
      },
    })

    if (current.workOrderId !== workOrderId) {
      throw createAppError("Material item does not belong to this work order", {
        status: 404,
        field: "itemId",
      })
    }

    assertVersionMatch(current.updatedAt, input.itemExpectedUpdatedAt, "Material item changed before save completed. Refresh and try again.")

      const touchedInventoryIds = new Set<string>()

      if (input.item.productId !== undefined && input.item.productId !== current.productId) {
        const currentAllocationInventoryIds = await tx.flooringWorkOrderItemAllocation.findMany({
          where: { workOrderItemId: itemId },
          select: { inventoryId: true },
        })
        for (const allocation of currentAllocationInventoryIds) {
          touchedInventoryIds.add(allocation.inventoryId)
        }
      await deleteAllAllocationsForWorkOrderItem(itemId, tx)
      }

    const itemUpdateData: Prisma.FlooringWorkOrderItemUncheckedUpdateInput = {}

    if (input.item.productId !== undefined) {
      itemUpdateData.productId = input.item.productId
    }
    if (input.item.quantity !== undefined) {
      itemUpdateData.quantity = input.item.quantity
    }
    if (input.item.unitPrice !== undefined && input.item.unitPrice !== null) {
      itemUpdateData.unitPrice = input.item.unitPrice
    }
    if (input.item.notes !== undefined) {
      itemUpdateData.notes = input.item.notes
    }
    await tx.flooringWorkOrderItem.update({
      where: { id: itemId },
      data: itemUpdateData,
    })

      for (const operation of input.allocationOperations) {
        if (operation.type === "create") {
          const result = await applyManualAllocationChangeUseCase(
            {
              workOrderId,
              workOrderItemId: itemId,
              inventoryId: operation.input.inventoryId,
              quantity: operation.input.quantity,
              cutSize: operation.input.cutSize,
              notes: operation.input.notes,
            },
            tx,
          )
          for (const inventoryId of result.touchedInventoryIds) {
            touchedInventoryIds.add(inventoryId)
          }
          continue
        }

      const allocation = await tx.flooringWorkOrderItemAllocation.findUniqueOrThrow({
        where: { id: operation.allocationId },
        select: {
          id: true,
          workOrderItemId: true,
          updatedAt: true,
        },
      })

      if (allocation.workOrderItemId !== itemId) {
        throw createAppError("Allocation does not belong to the selected material item", {
          status: 404,
          field: "allocationId",
        })
      }

      assertVersionMatch(
        allocation.updatedAt,
        operation.expectedUpdatedAt,
        "Allocation changed before save completed. Refresh and try again.",
      )

        if (operation.type === "update") {
          const result = await applyManualAllocationChangeUseCase(
            {
              workOrderId,
              workOrderItemId: itemId,
              allocationId: operation.allocationId,
              inventoryId: operation.input.inventoryId,
              quantity: operation.input.quantity,
              cutSize: operation.input.cutSize,
              notes: operation.input.notes,
            },
            tx,
          )
          for (const inventoryId of result.touchedInventoryIds) {
            touchedInventoryIds.add(inventoryId)
          }
          continue
        }

        const result = await removeWorkOrderItemAllocationUseCase(
          {
            workOrderId,
            workOrderItemId: itemId,
            allocationId: operation.allocationId,
          },
          tx,
        )
        for (const inventoryId of result.touchedInventoryIds) {
          touchedInventoryIds.add(inventoryId)
        }
      }

      if (touchedInventoryIds.size > 0) {
        await refreshInventoryReservedStockCounts(
          collectAffectedReservationInventoryIds(Array.from(touchedInventoryIds)),
          tx,
        )
      }

      await reconcileWorkOrderAllocationStatusesUseCase(workOrderId, tx)

      return tx.flooringWorkOrderItem.findUniqueOrThrow({
        where: { id: itemId },
        include: workOrderItemInclude,
      })
    })

    return normalizeWorkOrderItem(updated)
  } catch (error) {
    normalizeWorkOrderAllocationApplicationError(error)
  }
}
