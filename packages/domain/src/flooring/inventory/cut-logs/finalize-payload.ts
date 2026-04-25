import { z } from "zod"

/**
 * Canonical outbox-event contract for "user requested cut-log finalization."
 *
 * The application use case opens a transaction, flips the cut log from
 * PENDING toward FINAL by enqueuing this payload to the outbox; the relay
 * dispatches to the worker, and the worker stamps the FINAL fields atomically
 * (`before` / `after` / `cost` / `freight` / `coverageCut`).
 *
 * `inventoryId` is denormalized into the payload so the worker can lock the
 * parent inventory row without an extra read — mirrors the `importEntryId`
 * denormalization in `ImportMaterializeBatchPayloadSchema`.
 */

export const FINALIZE_CUT_LOG_TOPIC = "flooring.cut-log.finalize" as const

export const FinalizeCutLogPayloadSchema = z.object({
  topic: z.literal(FINALIZE_CUT_LOG_TOPIC),
  cutLogId: z.string().uuid(),
  inventoryId: z.string().uuid(),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: z.string().datetime(),
})

export type FinalizeCutLogPayload = z.infer<typeof FinalizeCutLogPayloadSchema>

export function parseFinalizeCutLogPayload(input: unknown): FinalizeCutLogPayload {
  return FinalizeCutLogPayloadSchema.parse(input)
}
