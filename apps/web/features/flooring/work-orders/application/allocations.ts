import {
  buildWorkOrderAutoAllocationIdempotencyKey,
  collectAffectedReservationInventoryIds,
  WORK_ORDER_AUTO_ALLOCATION_AGGREGATE_TYPE,
  WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
  type WorkOrderAutoAllocationRequestedOutboxEventV1,
} from "@builders/domain"
import {
  Prisma,
  createQueueOutboxEvent,
  createWorkOrderAllocationRun,
  createWorkOrderItemAllocation,
  deleteWorkOrderItemAllocation,
  findActiveWorkOrderAllocationRun,
  findWorkOrderAllocationRunBySourceVersion,
  getWorkOrderItemAllocationInventoryContext,
  getWorkOrderAllocationRunById,
  lockWorkOrderAllocationScope,
  listInventoryAllocationOptionsForWorkOrderProduct,
  listInventoryAllocationOptionsForWorkOrderItem,
  listWorkOrderItemAllocations,
  refreshInventoryReservedStockCounts,
  syncWorkOrderAllocationStatuses,
  supersedePendingWorkOrderAllocationRuns,
  updateWorkOrderItemAllocation,
  withDatabaseTransaction,
  db,
} from "@builders/db"
import { createAppError } from "@/server/http/api-helpers"
import { buildInvoiceInvalidationFields } from "../invoice-state"

export async function listWorkOrderItemAllocationsUseCase(workOrderId: string, workOrderItemId: string) {
  return listWorkOrderItemAllocations(workOrderId, workOrderItemId)
}

export async function listInventoryAllocationOptionsUseCase(workOrderId: string, workOrderItemId: string) {
  return listInventoryAllocationOptionsForWorkOrderItem(workOrderId, workOrderItemId)
}

export async function listInventoryAllocationOptionsForProductUseCase(workOrderId: string, productId: string) {
  return listInventoryAllocationOptionsForWorkOrderProduct(workOrderId, productId)
}

export async function createWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  quantity: Prisma.Decimal
  cutSize?: string | null
  notes?: string | null
}) {
  return withDatabaseTransaction(async (tx) => {
    const allocation = await createWorkOrderItemAllocation({
      ...input,
      method: "MANUAL",
    }, tx)

    await refreshInventoryReservedStockCounts(
      collectAffectedReservationInventoryIds([allocation.inventoryId]),
      tx,
    )

    await tx.flooringWorkOrder.update({
      where: { id: input.workOrderId },
      data: buildInvoiceInvalidationFields(),
    })

    await syncWorkOrderAllocationStatuses(input.workOrderId, tx)

    return allocation
  })
}

export async function updateWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  allocationId: string
  inventoryId?: string
  quantity?: Prisma.Decimal
  cutSize?: string | null
  notes?: string | null
}) {
  return withDatabaseTransaction(async (tx) => {
    const existing = await getWorkOrderItemAllocationInventoryContext(input.allocationId, tx)
    if (!existing) {
      throw createAppError("Allocation not found", { status: 404 })
    }

    const allocation = await updateWorkOrderItemAllocation(input, tx)

    await refreshInventoryReservedStockCounts(
      collectAffectedReservationInventoryIds([existing.inventoryId], [allocation.inventoryId]),
      tx,
    )

    await tx.flooringWorkOrder.update({
      where: { id: input.workOrderId },
      data: buildInvoiceInvalidationFields(),
    })

    await syncWorkOrderAllocationStatuses(input.workOrderId, tx)

    return allocation
  })
}

export async function deleteWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  allocationId: string
}) {
  return withDatabaseTransaction(async (tx) => {
    const existing = await getWorkOrderItemAllocationInventoryContext(input.allocationId, tx)
    if (!existing) {
      throw createAppError("Allocation not found", { status: 404 })
    }

    await deleteWorkOrderItemAllocation(input, tx)

    await refreshInventoryReservedStockCounts(
      collectAffectedReservationInventoryIds([existing.inventoryId]),
      tx,
    )

    await tx.flooringWorkOrder.update({
      where: { id: input.workOrderId },
      data: buildInvoiceInvalidationFields(),
    })

    await syncWorkOrderAllocationStatuses(input.workOrderId, tx)
  })
}

export async function getWorkOrderAutoAllocationStatusUseCase(workOrderId: string) {
  const workOrder = await db.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      updatedAt: true,
    },
  })

  const currentRun = await findWorkOrderAllocationRunBySourceVersion(workOrderId, workOrder.updatedAt)
  if (currentRun) {
    return currentRun
  }

  return findActiveWorkOrderAllocationRun(workOrderId)
}

export async function requestWorkOrderAutoAllocationUseCase(input: {
  workOrderId: string
  triggeredByUserId: string
  requestId: string
}) {
  return withDatabaseTransaction(async (tx) => {
    await lockWorkOrderAllocationScope(tx, input.workOrderId)

    const workOrder = await tx.flooringWorkOrder.findUniqueOrThrow({
      where: { id: input.workOrderId },
      select: {
        id: true,
        updatedAt: true,
      },
    })
    const sourceVersion = workOrder.updatedAt
    const sourceVersionIso = sourceVersion.toISOString()
    const existingRun = await findWorkOrderAllocationRunBySourceVersion(workOrder.id, sourceVersion, tx)
    if (existingRun) {
      return existingRun
    }

    const activeRun = await findActiveWorkOrderAllocationRun(input.workOrderId, tx)
    if (activeRun) {
      if (activeRun.sourceVersion === sourceVersionIso) {
        return activeRun
      }

      if (activeRun.status === "PROCESSING") {
        throw createAppError(
          "Auto allocation is already processing for an older work order version. Wait for it to finish and retry.",
          { status: 409, field: "updatedAt", payload: { run: activeRun } },
        )
      }

      await supersedePendingWorkOrderAllocationRuns({
        workOrderId: input.workOrderId,
        excludeSourceVersion: sourceVersion,
      }, tx)
    }

    const now = new Date()
    const idempotencyKey = buildWorkOrderAutoAllocationIdempotencyKey(workOrder.id, sourceVersionIso)
    let run

    try {
      run = await createWorkOrderAllocationRun(
        {
          workOrderId: workOrder.id,
          requestedByUserId: input.triggeredByUserId,
          sourceVersion,
          idempotencyKey,
          requestId: input.requestId,
          requestedAt: now,
        },
        tx,
      )
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const replayRun = await findWorkOrderAllocationRunBySourceVersion(workOrder.id, sourceVersion, tx)
        if (replayRun) {
          return replayRun
        }
      }

      throw error
    }

    const outboxPayload: WorkOrderAutoAllocationRequestedOutboxEventV1 = {
      version: "v1",
      topic: WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
      requestId: input.requestId,
      allocationRunId: run.id,
      workOrderId: input.workOrderId,
      requestedByUserId: input.triggeredByUserId,
      idempotencyKey,
      sourceVersion: run.sourceVersion,
      requestedAt: run.requestedAt,
    }

    await createQueueOutboxEvent(
      {
        topic: WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
        aggregateType: WORK_ORDER_AUTO_ALLOCATION_AGGREGATE_TYPE,
        aggregateId: run.id,
        idempotencyKey,
        payloadJson: outboxPayload,
        availableAt: now,
      },
      tx,
    )

    return run
  })
}

export async function getWorkOrderAutoAllocationRunByIdUseCase(allocationRunId: string) {
  return getWorkOrderAllocationRunById(allocationRunId, db)
}
