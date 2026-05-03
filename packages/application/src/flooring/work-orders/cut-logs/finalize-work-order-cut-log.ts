import {
  Prisma,
  createQueueOutboxEvent,
  markWorkOrderItemStatus,
  withDatabaseTransaction,
} from "@builders/db"
import {
  FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC,
  FinalizeWorkOrderCutLogBatchPayloadSchema,
  assertWorkOrderItemStatusTransition,
  canFinalizeCutLog,
  getCutLogFinalizabilityBlocker,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"
import type {
  FinalizeWorkOrderCutLogBatchInput,
  FinalizeWorkOrderCutLogBatchResult,
} from "./types.js"

/**
 * Producer for the finalize-batch flow.
 *
 * The selection may span multiple WOMIs and multiple inventories under
 * one work order. In a single TX:
 *   1. Read every cut log in the selection. Reject if any row does not
 *      link to the input `workOrderId`, is not currently PENDING, or
 *      fails the domain `canFinalizeCutLog` predicate.
 *   2. Derive the touched WOMI set. Transition each `current → FINALIZING`
 *      via the status rule.
 *   3. Mark every touched WOMI `FINALIZING`.
 *   4. Write the outbox event with idempotency key folding `requestKey`.
 *
 * The worker then locks all touched inventories deterministically and
 * applies the finalize batch.
 */
export async function finalizeWorkOrderCutLogBatchUseCase(
  input: FinalizeWorkOrderCutLogBatchInput,
  client?: Prisma.TransactionClient,
): Promise<FinalizeWorkOrderCutLogBatchResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.cutLogIds.length === 0) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_VALIDATION_FAILED",
        message: "Select at least one cut log to finalize",
        status: 400,
      })
    }

    const rows = await c.flooringCutLog.findMany({
      where: { id: { in: input.cutLogIds } },
      select: {
        id: true,
        cutLogNumber: true,
        workOrderId: true,
        workOrderItemId: true,
        status: true,
        isFinal: true,
        void: true,
        cut: true,
        before: true,
        after: true,
      },
    })

    if (rows.length !== input.cutLogIds.length) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "One or more selected cut logs were not found",
        status: 404,
        payload: {
          requestedCount: input.cutLogIds.length,
          foundCount: rows.length,
        },
      })
    }

    const blockers: Array<{ cutLogId: string; cutLogNumber: string; reason: string }> = []
    const touchedWorkOrderItemIds = new Set<string>()

    for (const row of rows) {
      if (row.workOrderId !== input.workOrderId || row.workOrderItemId === null) {
        blockers.push({
          cutLogId: row.id,
          cutLogNumber: row.cutLogNumber,
          reason: "Cut log does not belong to this work order",
        })
        continue
      }
      const predicateRow = {
        status: row.status,
        cut: row.cut.toString(),
        isFinal: row.isFinal,
        void: row.void,
      }
      const blocker = getCutLogFinalizabilityBlocker(predicateRow)
      if (blocker !== null) {
        blockers.push({
          cutLogId: row.id,
          cutLogNumber: row.cutLogNumber,
          reason: blocker,
        })
        continue
      }
      if (!canFinalizeCutLog(predicateRow)) {
        blockers.push({
          cutLogId: row.id,
          cutLogNumber: row.cutLogNumber,
          reason: "Cut log is not in a finalizable state",
        })
        continue
      }
      touchedWorkOrderItemIds.add(row.workOrderItemId)
    }

    if (blockers.length > 0) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED",
        message: "One or more selected cut logs cannot be finalized",
        status: 409,
        payload: { blockers },
      })
    }

    // Verify status transitions for each touched WOMI before any writes.
    const womiList = await c.flooringWorkOrderItem.findMany({
      where: { id: { in: Array.from(touchedWorkOrderItemIds) } },
      select: { id: true, status: true },
    })
    for (const womi of womiList) {
      try {
        assertWorkOrderItemStatusTransition({
          current: womi.status,
          next: "FINALIZING",
        })
      } catch (error) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_ITEM_INVALID_STATUS_TRANSITION",
          message: "One or more material items are busy with another cut-log operation",
          status: 409,
          payload: {
            workOrderItemId: womi.id,
            current: womi.status,
            next: "FINALIZING",
            cause: String(error),
          },
        })
      }
    }

    for (const womi of womiList) {
      await markWorkOrderItemStatus(womi.id, "FINALIZING", c)
    }

    const requestedAt = new Date().toISOString()
    const idempotencyKey = [
      "wo-cl-finalize",
      input.workOrderId,
      input.requestKey,
    ].join(":")

    const payload = FinalizeWorkOrderCutLogBatchPayloadSchema.parse({
      version: "v1",
      topic: FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC,
      workOrderId: input.workOrderId,
      requestKey: input.requestKey,
      cutLogIds: input.cutLogIds,
      requestedBy: input.requestedBy,
      requestedAt,
    })

    const { event, wasDuplicate } = await createQueueOutboxEvent(
      {
        topic: FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC,
        aggregateType: "FlooringWorkOrder",
        aggregateId: input.workOrderId,
        idempotencyKey,
        payloadJson: payload as Prisma.InputJsonValue,
      },
      c,
    )

    return {
      outboxEventId: event.id,
      wasDuplicate,
      touchedWorkOrderItemIds: Array.from(touchedWorkOrderItemIds),
    }
  })
}
