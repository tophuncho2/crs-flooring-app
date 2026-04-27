import {
  Prisma,
  createQueueOutboxEvent,
  getCutLogForVoid,
  getInventoryParentContextForCutLogs,
  markCutLogForVoid,
  withDatabaseTransaction,
} from "@builders/db"
import {
  VOID_CUT_LOG_TOPIC,
  VoidCutLogPayloadSchema,
  buildCutLogVoidNotAllowedMessage,
  validateCutLogVoidRequest,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type {
  MarkCutLogForVoidInput,
  MarkCutLogForVoidResult,
} from "./types.js"

/**
 * Producer use case for the cut-log void flow. Always single-row per
 * intent doc — there is no batch void.
 *
 * What this does:
 *  1. Locks the parent inventory FOR UPDATE.
 *  2. Snapshots the row + asserts `validateCutLogVoidRequest` passes.
 *  3. Calls `markCutLogForVoid` (data primitive flips PENDING|FINAL →
 *     QUEUED). If `marked === false`, the row drifted between snapshot
 *     and update — surfaces as `CUT_LOG_BATCH_RACE`.
 *  4. Writes the `void-cut-log` outbox event with the single `cutLogId`.
 */
export async function markCutLogForVoidUseCase(
  input: MarkCutLogForVoidInput,
  client?: Prisma.TransactionClient,
): Promise<MarkCutLogForVoidResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${input.inventoryId} FOR UPDATE`,
    )

    const parent = await getInventoryParentContextForCutLogs(c, input.inventoryId)
    if (!parent) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_PARENT_NOT_FOUND",
        message: "Inventory not found.",
        status: 404,
      })
    }

    const row = await getCutLogForVoid(c, input.cutLogId)
    if (!row) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found.",
        status: 404,
      })
    }

    const issue = validateCutLogVoidRequest(row)
    if (issue !== null) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_VOID_NOT_ALLOWED",
        message: buildCutLogVoidNotAllowedMessage(issue.reason),
        status: 400,
        payload: { issue },
      })
    }

    const result = await markCutLogForVoid(c, {
      inventoryId: input.inventoryId,
      cutLogId: input.cutLogId,
    })

    if (!result.marked) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_BATCH_RACE",
        message:
          "Cut log changed state before the void could be queued. Reload and try again.",
        status: 409,
      })
    }

    const requestedAt = new Date().toISOString()
    const payload = VoidCutLogPayloadSchema.parse({
      version: "v1",
      topic: VOID_CUT_LOG_TOPIC,
      inventoryId: input.inventoryId,
      cutLogId: input.cutLogId,
      requestedBy: input.requestedBy,
      requestedAt,
    })

    const idempotencyKey = `cut-log-void:${input.inventoryId}:${input.cutLogId}`

    const { event, wasDuplicate } = await createQueueOutboxEvent(
      {
        topic: VOID_CUT_LOG_TOPIC,
        aggregateType: "FlooringInventory",
        aggregateId: input.inventoryId,
        idempotencyKey,
        payloadJson: payload as Prisma.InputJsonValue,
      },
      c,
    )

    return {
      outboxEventId: event.id,
      wasDuplicate,
    }
  })
}
