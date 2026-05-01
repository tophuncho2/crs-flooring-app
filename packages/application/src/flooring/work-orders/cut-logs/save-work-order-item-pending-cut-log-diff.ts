import { randomUUID } from "node:crypto"
import {
  Prisma,
  createQueueOutboxEvent,
  markWorkOrderItemStatus,
  withDatabaseTransaction,
} from "@builders/db"
import {
  SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC,
  SaveWorkOrderItemPendingCutLogDiffPayloadSchema,
  assertCutLogLinkageSymmetry,
  assertWorkOrderItemStatusTransition,
  assignDraftIds,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"
import type {
  SaveWorkOrderItemPendingCutLogDiffInput,
  SaveWorkOrderItemPendingCutLogDiffResult,
} from "./types.js"

/**
 * Producer for the WO-side pending cut-log diff.
 *
 * In a single TX:
 *   1. Read the WOMI and assert it belongs to the work order in the input.
 *   2. Transition WOMI status `current → SAVING_CUTS` via the domain
 *      transition rule (catches FINALIZING and other in-flight states).
 *   3. Stamp UUIDs onto every draft via `assignDraftIds`. Every draft
 *      carries `workOrderId` + `workOrderItemId` linkage in the outbox
 *      payload — `assertCutLogLinkageSymmetry` runs over the producer-stamped
 *      pair so any future divergence trips the predicate before the
 *      outbox row is written.
 *   4. Write the outbox event with idempotency key folding `requestKey`.
 *
 * The worker (consumer) takes the multi-inventory FOR UPDATE lock and
 * applies the diff. Cost + freight are intentionally absent from the
 * payload — WO-side cut logs always write null (locked decision #3).
 */
export async function saveWorkOrderItemPendingCutLogDiffUseCase(
  input: SaveWorkOrderItemPendingCutLogDiffInput,
  client?: Prisma.TransactionClient,
): Promise<SaveWorkOrderItemPendingCutLogDiffResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const womi = await c.flooringWorkOrderItem.findUnique({
      where: { id: input.workOrderItemId },
      select: { id: true, workOrderId: true, status: true },
    })
    if (!womi) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Work order material item not found",
        status: 404,
      })
    }
    if (womi.workOrderId !== input.workOrderId) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Material item does not belong to this work order",
        status: 400,
        payload: {
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: womi.workOrderId,
        },
      })
    }

    try {
      assertWorkOrderItemStatusTransition({
        current: womi.status,
        next: "SAVING_CUTS",
      })
    } catch (error) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_ITEM_INVALID_STATUS_TRANSITION",
        message: "Material item is currently busy with another cut-log operation",
        status: 409,
        payload: { current: womi.status, next: "SAVING_CUTS", cause: String(error) },
      })
    }

    // Linkage symmetry is constant across all drafts (every draft inherits
    // the WOMI's workOrderId + the WOMI's id), so assert once up front.
    assertCutLogLinkageSymmetry({
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)
    const tempIdMap: Record<string, string> = {}
    for (const draft of addedWithIds) {
      tempIdMap[draft.tempId] = draft.id
    }

    await markWorkOrderItemStatus(input.workOrderItemId, "SAVING_CUTS", c)

    const requestedAt = new Date().toISOString()
    // BullMQ idempotency keys must split into exactly 3 parts. We
    // include `requestKey` (client-generated UUID) so duplicate submits
    // collapse via the outbox unique constraint.
    const idempotencyKey = [
      "wo-pcl-diff",
      input.workOrderItemId,
      input.requestKey,
    ].join(":")

    const payload = SaveWorkOrderItemPendingCutLogDiffPayloadSchema.parse({
      version: "v1",
      topic: SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC,
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
      requestKey: input.requestKey,
      diff: {
        added: addedWithIds.map((draft) => ({
          id: draft.id,
          tempId: draft.tempId,
          inventoryId: draft.inventoryId,
          cut: draft.cut,
          isWaste: draft.isWaste,
          notes: draft.notes,
        })),
        modified: input.diff.modified,
        deleted: input.diff.deleted,
      },
      requestedBy: input.requestedBy,
      requestedAt,
    })

    const { event, wasDuplicate } = await createQueueOutboxEvent(
      {
        topic: SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC,
        aggregateType: "FlooringWorkOrderItem",
        aggregateId: input.workOrderItemId,
        idempotencyKey,
        payloadJson: payload as Prisma.InputJsonValue,
      },
      c,
    )

    return {
      outboxEventId: event.id,
      wasDuplicate,
      tempIdMap,
    }
  })
}
