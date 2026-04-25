import { z } from "zod"

/**
 * Canonical outbox-event contract for "user queued N staged rows for import."
 *
 * The application use case opens a transaction, transitions the selected
 * staged rows from DRAFT → QUEUED, and writes one outbox row carrying this
 * payload. The relay service polls the outbox and dispatches to the worker
 * queue; the worker reads `stagedRowIds` and materializes each into a live
 * inventory row, then transitions the staged rows to IMPORTED.
 *
 * Shape mirrors the work-order auto-allocation contract at
 * `packages/domain/src/queue/auto-allocate-work-order.ts` — versioned, topic
 * literal for downstream discriminators, ISO 8601 timestamps as strings, hard
 * upper bound on `stagedRowIds` so a single batch doesn't blow past the
 * worker's transaction budget.
 */

export const IMPORT_MATERIALIZE_TOPIC = "flooring.imports.materialize" as const

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
