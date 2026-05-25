import {
  Prisma,
  createQueueOutboxEvent,
  getImportById,
  listStagedInventoryByImport,
  markStagedRowsForImport,
  withDatabaseTransaction,
} from "@builders/db"
import {
  IMPORT_MATERIALIZE_TOPIC,
  ImportMaterializeBatchPayloadSchema,
  buildMarkForImportSelectionMessage,
  buildStagedImportBatchIneligibleMessage,
  validateMarkForImportSelection,
  validateStagedImportBatch,
} from "@builders/domain"
import { sha256Hex } from "@builders/lib/hashing"
import { StagedInventoryExecutionError } from "./errors.js"
import type { MarkStagedRowsForImportResult } from "./types.js"

export async function markStagedRowsForImportUseCase(
  importEntryId: string,
  stagedRowIds: string[],
  requestedBy: { userId: string; userEmail: string },
  client?: Prisma.TransactionClient,
): Promise<MarkStagedRowsForImportResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const selectionIssues = validateMarkForImportSelection(stagedRowIds)
    if (selectionIssues.length > 0) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: buildMarkForImportSelectionMessage(selectionIssues),
        status: 400,
        payload: { issues: selectionIssues },
      })
    }

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${importEntryId} FOR UPDATE`,
    )

    const parent = await getImportById(importEntryId, c)
    if (!parent) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_PARENT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    const requestedIdSet = new Set(stagedRowIds)
    const allRows = await listStagedInventoryByImport(importEntryId, c)
    const requestedRows = allRows.filter((row) => requestedIdSet.has(row.id))

    const issues = validateStagedImportBatch(requestedRows)
    if (issues.length > 0) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_BATCH_INELIGIBLE",
        message: buildStagedImportBatchIneligibleMessage(issues),
        status: 400,
        payload: { issues },
      })
    }

    const result = await markStagedRowsForImport(c, { importEntryId, stagedRowIds })

    if (result.skippedRowIds.length > 0) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_BATCH_RACE",
        message:
          "Some staged rows changed state before the import batch could be queued. Reload and try again.",
        status: 409,
        payload: { skippedRowIds: result.skippedRowIds },
      })
    }

    const requestedAt = new Date().toISOString()
    const sortedRowIds = [...result.markedRowIds].sort()
    const payload = ImportMaterializeBatchPayloadSchema.parse({
      version: "v1",
      topic: IMPORT_MATERIALIZE_TOPIC,
      importEntryId,
      stagedRowIds: sortedRowIds,
      requestedBy,
      requestedAt,
    })

    // Hash the row-id list to a fixed-length digest. The raw join grows
    // ~37 bytes/row and blows past Postgres' 2704-byte btree limit on the
    // idempotencyKey unique index around ~73 rows; the hash keeps the key a
    // constant ~120 chars at any batch size while preserving dedup semantics
    // (same row set → same key → wasDuplicate path still fires).
    const idempotencyKey = `import-materialize:${importEntryId}:${sha256Hex(sortedRowIds.join(","))}`

    const { event, wasDuplicate } = await createQueueOutboxEvent(
      {
        topic: IMPORT_MATERIALIZE_TOPIC,
        aggregateType: "FlooringImportEntry",
        aggregateId: importEntryId,
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
