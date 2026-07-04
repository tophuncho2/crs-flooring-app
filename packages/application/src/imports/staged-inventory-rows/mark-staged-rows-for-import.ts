import {
  Prisma,
  createQueueOutboxEvent,
  getImportById,
  listStagedInventoryByImport,
  lockImportRow,
  markStagedRowsForImport,
  stampImportActor,
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

    await lockImportRow(c, importEntryId)

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

    // Aggregate-root actor: queuing rows for import is a human mutation of the
    // import, so stamp the parent's `updatedBy` with the requester. (The later
    // worker materialize that flips QUEUED->IMPORTED is system-driven and does
    // NOT stamp.)
    await stampImportActor(c, importEntryId, requestedBy.userEmail)

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
