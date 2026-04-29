import { z } from "zod"

/**
 * Outbox + queue contract for "user clicked Save on a work-order material
 * item's pending-cut-log section." The diff is embedded so the worker can
 * apply creates / updates / deletes atomically across N inventories under
 * a single deterministic FOR UPDATE lock chain.
 *
 * Distinct from the inventory-side `flooring.cut-log.pending-save` payload:
 * this WO-scoped variant always stamps `workOrderId` + `workOrderItemId`
 * onto every draft (linkage symmetry per `assertCutLogLinkageSymmetry`),
 * and a single payload may touch cut logs across multiple inventories
 * (any inventory whose product matches the WOMI). Multi-inventory locking
 * is taken in deterministic ID-sorted order.
 *
 * Three layers consume this artifact:
 * - The application use case writes the outbox event after marking the
 *   WOMI status `IDLE → SAVING_CUTS`.
 * - The relay claims the event and enqueues a BullMQ job onto
 *   `SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE` under the
 *   `SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_JOB_NAME` label.
 * - The worker reads the job, parses via
 *   `parseSaveWorkOrderItemPendingCutLogDiffPayload`, locks all touched
 *   inventories, applies the diff, recomputes each inventory's
 *   `totalCutSum`, and marks WOMI status back to `IDLE` (or `FAILED`
 *   on throw).
 *
 * `requestKey` is a client-generated UUID per submit, folded into the
 * outbox idempotency key so a duplicate submit silently dedupes.
 *
 * Cost + freight are intentionally NOT in this payload — WO-side cut
 * logs always write `cost = null, freight = null` per locked sweep
 * decision.
 */

export const SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC =
  "flooring.work-order-item.pending-cut-log.save" as const
export const SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE =
  "flooring-work-order-item-pending-cut-log-diff" as const
export const SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_JOB_NAME =
  "pending-cut-log-diff" as const

const isoTimestamp = z.string().datetime()

const WorkOrderCutLogDraftPayload = z.object({
  // `id` is stamped by the producer use case (via assignCutLogDiffIds-equivalent
  // calling randomUUID()) BEFORE the outbox event is written, making the
  // worker's createMany idempotent across retries.
  id: z.string().uuid(),
  tempId: z.string().min(1),
  inventoryId: z.string().uuid(),
  cut: z.string(),
  isWaste: z.boolean(),
  notes: z.string(),
})

const WorkOrderCutLogPatchPayload = z.object({
  cut: z.string().optional(),
  isWaste: z.boolean().optional(),
  notes: z.string().optional(),
})

const WorkOrderCutLogUpdatePayload = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: isoTimestamp,
  patch: WorkOrderCutLogPatchPayload,
})

const WorkOrderCutLogDeletePayload = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: isoTimestamp,
})

export const SaveWorkOrderItemPendingCutLogDiffPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC),
  workOrderId: z.string().uuid(),
  workOrderItemId: z.string().uuid(),
  requestKey: z.string().uuid(),
  diff: z.object({
    added: z.array(WorkOrderCutLogDraftPayload).max(500),
    modified: z.array(WorkOrderCutLogUpdatePayload).max(500),
    deleted: z.array(WorkOrderCutLogDeletePayload).max(500),
  }),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type SaveWorkOrderItemPendingCutLogDiffPayload = z.infer<
  typeof SaveWorkOrderItemPendingCutLogDiffPayloadSchema
>

export function parseSaveWorkOrderItemPendingCutLogDiffPayload(
  value: unknown,
): SaveWorkOrderItemPendingCutLogDiffPayload {
  return SaveWorkOrderItemPendingCutLogDiffPayloadSchema.parse(value)
}
