import {
  Prisma,
  refreshInventoryReservedStockCounts,
  deleteAllAllocationsForWorkOrderItem,
  prisma,
} from "@builders/db"
import { collectAffectedReservationInventoryIds } from "@builders/domain"
import {
  applyManualAllocationChangeUseCase,
  reconcileWorkOrderAllocationStatusesUseCase,
  removeWorkOrderItemAllocationUseCase,
} from "@builders/execution"
import { createAppError } from "@/server/http/api-helpers"
import { normalizeWorkOrderAllocationApplicationError } from "./allocation-errors"
import type {
  UpdateWorkOrderItemAllocationInput,
  UpdateWorkOrderMaterialItemsSectionInput,
  UpdateWorkOrderSalesRepSectionInput,
  UpdateWorkOrderServiceSectionInput,
  WorkOrderMaterialItemInput,
  WorkOrderSalesRepInput,
  WorkOrderServiceItemInput,
} from "../validators"

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

export async function saveWorkOrderServiceItemsSectionUseCase(
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

export async function saveWorkOrderSalesRepsSectionUseCase(
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

export async function saveWorkOrderMaterialItemsSectionUseCase(
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

      await deleteAllAllocationsForWorkOrderItem(current.id, tx)
      for (const allocation of current.allocations) {
        touchedInventoryIds.add(allocation.inventoryId)
      }
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
