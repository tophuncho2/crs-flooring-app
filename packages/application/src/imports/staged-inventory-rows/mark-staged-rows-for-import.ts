import {
  Prisma,
  createQueueOutboxEvent,
  db,
  getImportPrimaryStateById,
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
  // Read-only validation work runs BEFORE the transaction, on the pooled client
  // (`db`) unless composed inside a caller's transaction. The existence read +
  // the staged-list read (whose 5-relation select would serialize on the single
  // interactive-transaction connection and wedge it) run out here on the pool;
  // the transaction below holds only the lock + the writes. The in-tx
  // `markStagedRowsForImport` re-checks `status = DRAFT` under the parent lock
  // and returns `skippedRowIds` → STAGED_BATCH_RACE (409), so the read-then-lock
  // race is already guarded.
  const reader = client ?? db

  const selectionIssues = validateMarkForImportSelection(stagedRowIds)
  if (selectionIssues.length > 0) {
    throw new StagedInventoryExecutionError({
      code: "STAGED_VALIDATION_FAILED",
      message: buildMarkForImportSelectionMessage(selectionIssues),
      status: 400,
      payload: { issues: selectionIssues },
    })
  }

  // Lean existence read on the pool — the payload is unused (existence only).
  const parent = await getImportPrimaryStateById(importEntryId, reader)
  if (!parent) {
    throw new StagedInventoryExecutionError({
      code: "STAGED_PARENT_NOT_FOUND",
      message: "Import not found.",
      status: 404,
    })
  }

  const requestedIdSet = new Set(stagedRowIds)
  const allRows = await listStagedInventoryByImport(importEntryId, reader)
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

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await lockImportRow(c, importEntryId)

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
