import { Prisma } from "@builders/db"
import {
  WORK_ORDER_AUTO_ALLOCATION_AGGREGATE_TYPE,
  WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
  buildWorkOrderAutoAllocationIdempotencyKey,
  type WorkOrderAutoAllocationRequestedOutboxEventV1,
} from "@builders/domain"
import {
  createQueueOutboxEvent,
  createWorkOrderAllocationRun,
  findActiveWorkOrderAllocationRunRow,
  findWorkOrderAllocationRunRowBySourceVersion,
  lockWorkOrderAllocationScope,
  withDatabaseTransaction,
} from "@builders/db"
import { WorkOrderAllocationExecutionError } from "./errors.js"
import { mapWorkOrderAllocationRunRowToRecord } from "./mappers.js"

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
    const existingRun = await findWorkOrderAllocationRunRowBySourceVersion(workOrder.id, sourceVersion, tx)
    if (existingRun) {
      return mapWorkOrderAllocationRunRowToRecord(existingRun)
    }

    const activeRun = await findActiveWorkOrderAllocationRunRow(input.workOrderId, tx)
    if (activeRun) {
      if (activeRun.sourceVersion.toISOString() === sourceVersionIso) {
        return mapWorkOrderAllocationRunRowToRecord(activeRun)
      }

      if (activeRun.status === "PROCESSING") {
        throw new WorkOrderAllocationExecutionError({
          code: "AUTO_ALLOCATION_CONFLICT",
          message:
            "Auto allocation is already processing for an older work order version. Wait for it to finish and retry.",
          status: 409,
          field: "updatedAt",
          payload: { run: mapWorkOrderAllocationRunRowToRecord(activeRun) },
        })
      }

      await tx.flooringWorkOrderAllocationRun.updateMany({
        where: {
          workOrderId: input.workOrderId,
          status: {
            in: ["REQUESTED", "QUEUED"],
          },
          sourceVersion: {
            not: sourceVersion,
          },
        },
        data: {
          status: "SUPERSEDED",
          failedAt: null,
          failureCode: null,
          failureMessage: null,
          completedAt: null,
        },
      })
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
        const replayRun = await findWorkOrderAllocationRunRowBySourceVersion(workOrder.id, sourceVersion, tx)
        if (replayRun) {
          return mapWorkOrderAllocationRunRowToRecord(replayRun)
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
      sourceVersion: run.sourceVersion.toISOString(),
      requestedAt: run.requestedAt.toISOString(),
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

    return mapWorkOrderAllocationRunRowToRecord(run)
  })
}
