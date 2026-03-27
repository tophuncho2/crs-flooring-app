import {
  buildWorkOrderAutoAllocationIdempotencyKey,
  WORK_ORDER_AUTO_ALLOCATION_AGGREGATE_TYPE,
  WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
  type WorkOrderAutoAllocationRequestedOutboxEventV1,
} from "@builders/domain"
import {
  createQueueOutboxEvent,
  createWorkOrderAllocationRun,
  createWorkOrderItemAllocation,
  deleteWorkOrderItemAllocation,
  findActiveWorkOrderAllocationRun,
  getLatestWorkOrderAllocationRun,
  getWorkOrderAllocationRunById,
  listInventoryAllocationOptionsForWorkOrderItem,
  listWorkOrderItemAllocations,
  updateWorkOrderItemAllocation,
  withDatabaseTransaction,
  db,
} from "@builders/db"
import { randomUUID } from "node:crypto"
import type { Prisma } from "@builders/db"

export async function listWorkOrderItemAllocationsUseCase(workOrderId: string, workOrderItemId: string) {
  return listWorkOrderItemAllocations(workOrderId, workOrderItemId)
}

export async function listInventoryAllocationOptionsUseCase(workOrderId: string, workOrderItemId: string) {
  return listInventoryAllocationOptionsForWorkOrderItem(workOrderId, workOrderItemId)
}

export async function createWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  quantity: Prisma.Decimal
  cutSize?: string | null
  notes?: string | null
}) {
  return createWorkOrderItemAllocation({
    ...input,
    method: "MANUAL",
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
  return updateWorkOrderItemAllocation(input)
}

export async function deleteWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  allocationId: string
}) {
  return deleteWorkOrderItemAllocation(input)
}

export async function getWorkOrderAutoAllocationStatusUseCase(workOrderId: string) {
  return getLatestWorkOrderAllocationRun(workOrderId)
}

export async function requestWorkOrderAutoAllocationUseCase(input: {
  workOrderId: string
  triggeredByUserId: string
  requestId: string
}) {
  return withDatabaseTransaction(async (tx) => {
    const activeRun = await findActiveWorkOrderAllocationRun(input.workOrderId, tx)
    if (activeRun) {
      return activeRun
    }

    const workOrder = await tx.flooringWorkOrder.findUniqueOrThrow({
      where: { id: input.workOrderId },
      select: {
        id: true,
        updatedAt: true,
      },
    })

    const now = new Date()
    const allocationRunId = randomUUID()
    const idempotencyKey = buildWorkOrderAutoAllocationIdempotencyKey(allocationRunId)

    const run = await createWorkOrderAllocationRun(
      {
        id: allocationRunId,
        workOrderId: workOrder.id,
        requestedByUserId: input.triggeredByUserId,
        sourceVersion: workOrder.updatedAt,
        idempotencyKey,
        requestId: input.requestId,
        requestedAt: now,
      },
      tx,
    )

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
