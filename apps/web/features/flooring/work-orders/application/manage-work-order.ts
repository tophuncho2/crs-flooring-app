import { Prisma, clearAllocationsForWorkOrder, listWorkOrderAllocationInventoryIds, prisma, refreshInventoryReservedStockCounts } from "@builders/db"
import { collectAffectedReservationInventoryIds } from "@builders/domain"
import { buildInvoiceInvalidationFields } from "../invoice-state"
import type { CreateWorkOrderInput, UpdateWorkOrderInput } from "@/features/flooring/work-orders/validators"
import { createWorkOrder } from "@/features/flooring/work-orders/mutations"
import { getWorkOrderById } from "../queries"

function isNullableStringEqual(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? null) === (right ?? null)
}

function isDateValueEqual(left: Date | null | undefined, right: Date | null | undefined) {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null)
}

export async function createWorkOrderUseCase(input: CreateWorkOrderInput) {
  return createWorkOrder(input)
}

export async function updateWorkOrderUseCase(id: string, input: UpdateWorkOrderInput) {
  await prisma.$transaction(async (tx) => {
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
      return
    }

    if (input.warehouseId !== undefined && input.warehouseId !== existing.warehouseId) {
      const affectedInventoryIds = await listWorkOrderAllocationInventoryIds(id, tx)
      await clearAllocationsForWorkOrder(id, tx)
      await refreshInventoryReservedStockCounts(collectAffectedReservationInventoryIds(affectedInventoryIds), tx)
    }

    Object.assign(data, buildInvoiceInvalidationFields())

    await tx.flooringWorkOrder.update({
      where: { id },
      data,
    })
  })

  return getWorkOrderById(id)
}

export async function deleteWorkOrderUseCase(id: string) {
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

  return { ok: true as const }
}
