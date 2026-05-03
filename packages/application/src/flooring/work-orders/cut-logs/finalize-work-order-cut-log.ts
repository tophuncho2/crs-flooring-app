import {
  Prisma,
  createQueueOutboxEvent,
  withDatabaseTransaction,
} from "@builders/db"
import {
  FINALIZE_WORK_ORDER_CUT_LOG_TOPIC,
  FinalizeWorkOrderCutLogPayloadSchema,
  canFinalizeCutLog,
  getCutLogFinalizabilityBlocker,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"
import type {
  FinalizeWorkOrderCutLogInput,
  FinalizeWorkOrderCutLogResult,
} from "./types.js"

/**
 * Producer for the single-row finalize flow.
 *
 * Finalization is one-cut-log-at-a-time, triggered from the cut-log side
 * panel's Finalize button. In a single TX:
 *   1. Read the cut log. Reject if it doesn't link to the input
 *      `workOrderId`, isn't currently PENDING, or fails the domain
 *      `canFinalizeCutLog` predicate.
 *   2. Write the outbox event with idempotency key folding `requestKey`.
 *
 * The worker takes the parent inventory's row lock and stamps
 * `before` / `after` / `finalCutSequence` based on the inventory's
 * current state. WOMI status is not consulted or mutated by this flow —
 * the inventory lock is the sole correctness mechanism.
 */
export async function finalizeWorkOrderCutLogUseCase(
  input: FinalizeWorkOrderCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<FinalizeWorkOrderCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const row = await c.flooringCutLog.findUnique({
      where: { id: input.cutLogId },
      select: {
        id: true,
        cutLogNumber: true,
        workOrderId: true,
        workOrderItemId: true,
        status: true,
        isFinal: true,
        void: true,
        cut: true,
      },
    })

    if (row === null) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
        payload: { cutLogId: input.cutLogId },
      })
    }

    if (row.workOrderId !== input.workOrderId || row.workOrderItemId === null) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Cut log does not belong to this work order",
        status: 400,
        payload: {
          cutLogId: row.id,
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: row.workOrderId,
        },
      })
    }

    const predicateRow = {
      status: row.status,
      cut: row.cut.toString(),
      isFinal: row.isFinal,
      void: row.void,
    }
    const blocker = getCutLogFinalizabilityBlocker(predicateRow)
    if (blocker !== null || !canFinalizeCutLog(predicateRow)) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED",
        message: "Cut log cannot be finalized",
        status: 409,
        payload: {
          cutLogId: row.id,
          cutLogNumber: row.cutLogNumber,
          reason: blocker ?? "ineligible",
        },
      })
    }

    const requestedAt = new Date().toISOString()
    const idempotencyKey = [
      "wo-cl-finalize",
      input.workOrderId,
      input.requestKey,
    ].join(":")

    const payload = FinalizeWorkOrderCutLogPayloadSchema.parse({
      version: "v1",
      topic: FINALIZE_WORK_ORDER_CUT_LOG_TOPIC,
      workOrderId: input.workOrderId,
      requestKey: input.requestKey,
      cutLogId: input.cutLogId,
      requestedBy: input.requestedBy,
      requestedAt,
    })

    const { event, wasDuplicate } = await createQueueOutboxEvent(
      {
        topic: FINALIZE_WORK_ORDER_CUT_LOG_TOPIC,
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
      touchedWorkOrderItemId: row.workOrderItemId,
    }
  })
}
