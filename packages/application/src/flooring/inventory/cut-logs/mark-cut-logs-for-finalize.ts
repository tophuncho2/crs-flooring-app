import {
  Prisma,
  createQueueOutboxEvent,
  getInventoryParentContextForCutLogs,
  listCutLogsForFinalizeBatch,
  markCutLogsForFinalize,
  withDatabaseTransaction,
} from "@builders/db"
import {
  FINALIZE_CUT_LOG_TOPIC,
  FinalizeCutLogBatchPayloadSchema,
  buildCutLogFinalizeBatchIneligibleMessage,
  validateCutLogFinalizeBatch,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type {
  MarkCutLogsForFinalizeInput,
  MarkCutLogsForFinalizeResult,
} from "./types.js"

/**
 * Producer use case for the cut-log finalize flow.
 *
 * What this does:
 *  1. Locks the parent inventory FOR UPDATE.
 *  2. Snapshots the requested rows + asserts they pass
 *     `validateCutLogFinalizeBatch`.
 *  3. Calls `markCutLogsForFinalize` (data primitive flips PENDING →
 *     QUEUED). Skips silently surface as `CUT_LOG_BATCH_RACE`.
 *  4. Writes the `finalize-cut-log-batch` outbox event with the marked
 *     row ids (sorted, for deterministic idempotency key).
 *
 * Mirrors `markStagedRowsForImportUseCase` — same shape.
 */
export async function markCutLogsForFinalizeUseCase(
  input: MarkCutLogsForFinalizeInput,
  client?: Prisma.TransactionClient,
): Promise<MarkCutLogsForFinalizeResult> {
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

    const requestedRows = await listCutLogsForFinalizeBatch(c, {
      inventoryId: input.inventoryId,
      cutLogIds: input.cutLogIds,
    })

    const issues = validateCutLogFinalizeBatch(requestedRows)
    if (issues.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_BATCH_INELIGIBLE",
        message: buildCutLogFinalizeBatchIneligibleMessage(issues),
        status: 400,
        payload: { issues },
      })
    }

    const result = await markCutLogsForFinalize(c, {
      inventoryId: input.inventoryId,
      cutLogIds: input.cutLogIds,
    })

    if (result.skippedRowIds.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_BATCH_RACE",
        message:
          "Some cut logs changed state before the finalize batch could be queued. Reload and try again.",
        status: 409,
        payload: { skippedRowIds: result.skippedRowIds },
      })
    }

    const requestedAt = new Date().toISOString()
    const sortedRowIds = [...result.markedRowIds].sort()
    const payload = FinalizeCutLogBatchPayloadSchema.parse({
      version: "v1",
      topic: FINALIZE_CUT_LOG_TOPIC,
      inventoryId: input.inventoryId,
      cutLogIds: sortedRowIds,
      requestedBy: input.requestedBy,
      requestedAt,
    })

    const idempotencyKey = `cut-log-finalize:${input.inventoryId}:${sortedRowIds.join(",")}`

    const { event, wasDuplicate } = await createQueueOutboxEvent(
      {
        topic: FINALIZE_CUT_LOG_TOPIC,
        aggregateType: "FlooringInventory",
        aggregateId: input.inventoryId,
        idempotencyKey,
        payloadJson: payload as Prisma.InputJsonValue,
      },
      c,
    )

    return {
      markedRowIds: result.markedRowIds,
      outboxEventId: event.id,
      wasDuplicate,
    }
  })
}
