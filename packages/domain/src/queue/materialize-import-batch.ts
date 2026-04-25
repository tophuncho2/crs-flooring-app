import { z } from "zod"

/**
 * Outbox + queue contract for "user queued N staged rows for materialization."
 *
 * One topic-aware artifact, consumed by three layers:
 * - The application use case (`markStagedRowsForImportUseCase`) writes the
 *   outbox event with this payload after flipping staged rows DRAFT → QUEUED.
 * - The relay claims the event and enqueues a BullMQ job onto
 *   `IMPORT_MATERIALIZE_QUEUE` under the `IMPORT_MATERIALIZE_JOB_NAME` label.
 * - The worker reads the job, parses via `parseImportMaterializeBatchPayload`,
 *   and calls `materializeImportedStagedRowsUseCase`.
 *
 * Hard upper bound on `stagedRowIds` keeps a single batch within the worker's
 * transaction budget.
 */

export const IMPORT_MATERIALIZE_TOPIC = "flooring.imports.materialize" as const
export const IMPORT_MATERIALIZE_QUEUE = "flooring-imports-materialize" as const
export const IMPORT_MATERIALIZE_JOB_NAME = "materialize-batch" as const

const isoTimestamp = z.string().datetime()

export const ImportMaterializeBatchPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(IMPORT_MATERIALIZE_TOPIC),
  importEntryId: z.string().uuid(),
  stagedRowIds: z.array(z.string().uuid()).min(1).max(500),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type ImportMaterializeBatchPayload = z.infer<typeof ImportMaterializeBatchPayloadSchema>

export function parseImportMaterializeBatchPayload(
  value: unknown,
): ImportMaterializeBatchPayload {
  return ImportMaterializeBatchPayloadSchema.parse(value)
}
