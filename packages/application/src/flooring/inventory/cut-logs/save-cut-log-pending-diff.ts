import { randomUUID } from "node:crypto"
import {
  Prisma,
  createQueueOutboxEvent,
  getInventoryParentContextForCutLogs,
  listCutLogsForPendingSaveDiff,
  withDatabaseTransaction,
} from "@builders/db"
import {
  PENDING_SAVE_CUT_LOG_TOPIC,
  PendingSaveCutLogBatchPayloadSchema,
  assignCutLogDiffIds,
  describeCutLogDiffIssues,
  validateCutLogsDiff,
  type CutLogDraft,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type {
  SaveCutLogPendingDiffInput,
  SaveCutLogPendingDiffResult,
} from "./types.js"

/**
 * Producer use case for the cut-log pending-save flow.
 *
 * What this does:
 *  1. Locks the parent inventory FOR UPDATE so the read snapshot is
 *     consistent with concurrent finalize / void / link-edit jobs.
 *  2. Snapshots existing cut logs + parent context.
 *  3. Stamps every added draft with a real UUID via `assignCutLogDiffIds`.
 *  4. Validates the (id-stamped) diff via `validateCutLogsDiff` —
 *     includes the `totalCutSum ≤ startingStock` check, so any save
 *     that would breach the invariant is rejected pre-outbox.
 *  5. Writes the `pending-save-cut-log-batch` outbox event with the
 *     full diff embedded in the payload.
 *
 * What this does NOT do:
 *  - Mutate `flooring_cut_log` rows. The worker (`applyCutLogPendingDiffUseCase`)
 *    is the only writer. Status of touched rows stays PENDING throughout —
 *    the outbox event is the in-flight marker, not the row's `status`.
 *  - Recompute `totalCutSum`. The worker does that after applying the diff.
 *
 * Idempotency: keyed on `inventoryId` + sorted touched ids + `requestedAt`.
 * The `requestedAt` keeps fast-retried saves from collapsing into the
 * same key (each "Save click" is a distinct intent); content-level
 * dedup happens via the outbox unique constraint if the same payload
 * arrives twice.
 */
export async function saveCutLogPendingDiffUseCase(
  input: SaveCutLogPendingDiffInput,
  client?: Prisma.TransactionClient,
): Promise<SaveCutLogPendingDiffResult> {
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

    const existing = await listCutLogsForPendingSaveDiff(c, input.inventoryId)

    // Stamp tempIds → uuids BEFORE validation so the diff that lands in
    // the outbox payload has the same ids the worker will apply.
    const addedWithIds = assignCutLogDiffIds(input.diff.added, () => randomUUID())
    const tempIdMap: Record<string, string> = {}
    for (const draft of addedWithIds) {
      tempIdMap[draft.tempId] = draft.id
    }

    const stampedDiff = {
      added: addedWithIds.map<CutLogDraft>((draft) => ({
        tempId: draft.tempId,
        cut: draft.cut,
        cost: draft.cost,
        freight: draft.freight,
        isWaste: draft.isWaste,
        notes: draft.notes,
      })),
      modified: input.diff.modified,
      deleted: input.diff.deleted,
    }

    const issues = validateCutLogsDiff(
      stampedDiff,
      { existing },
      parent,
    )
    if (issues.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_DIFF_VALIDATION_FAILED",
        message: describeCutLogDiffIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    const requestedAt = new Date().toISOString()
    const sortedAddedIds = addedWithIds.map((d) => d.id).sort()
    const sortedModifiedIds = input.diff.modified.map((m) => m.id).sort()
    const sortedDeletedIds = input.diff.deleted.map((d) => d.id).sort()
    const idempotencyKey = [
      "cut-log-pending-save",
      input.inventoryId,
      `a:${sortedAddedIds.join(",")}`,
      `m:${sortedModifiedIds.join(",")}`,
      `d:${sortedDeletedIds.join(",")}`,
      requestedAt,
    ].join(":")

    const payload = PendingSaveCutLogBatchPayloadSchema.parse({
      version: "v1",
      topic: PENDING_SAVE_CUT_LOG_TOPIC,
      inventoryId: input.inventoryId,
      diff: {
        added: addedWithIds.map((draft) => ({
          id: draft.id,
          tempId: draft.tempId,
          cut: draft.cut,
          cost: draft.cost,
          freight: draft.freight,
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
        topic: PENDING_SAVE_CUT_LOG_TOPIC,
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
      tempIdMap,
    }
  })
}
