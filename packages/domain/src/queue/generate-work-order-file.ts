import { z } from "zod"

/**
 * Outbox + queue contract for "user clicked Generate File on a work
 * order." One-shot per FlooringWorkOrderFile row — the producer creates
 * the file row at QUEUED and writes this event in the same TX.
 *
 * Three layers consume this artifact:
 * - The application use case (`request-work-order-file`) writes the
 *   outbox event after inserting the FlooringWorkOrderFile at status
 *   `QUEUED` and marking the WO row's status `IDLE → QUEUED`.
 * - The relay claims the event and enqueues a BullMQ job onto
 *   `GENERATE_WORK_ORDER_FILE_QUEUE` under the
 *   `GENERATE_WORK_ORDER_FILE_JOB_NAME` label.
 * - The worker reads the job, parses via
 *   `parseGenerateWorkOrderFilePayload`, marks the file row WORKING,
 *   reads the joined snapshot via `getWorkOrderForFileGeneration`,
 *   builds HTML via `buildWorkOrderPdfHtml`, renders to PDF via
 *   `renderHtmlToPdf` (`@builders/pdf`), uploads via
 *   `uploadBucketObject` (`@builders/lib`), then marks the file row
 *   COMPLETED with the bucket key.
 *
 * `fileId` is denormalized so the worker can lock the file row without
 * an extra read. Idempotency key is folded by the producer using
 * `wo-file-gen:${workOrderId}:${fileId}` so re-firing the outbox event
 * is a no-op against the unique constraint.
 *
 * The PDF artifact in the bucket IS the snapshot — there is no separate
 * snapshot table or JSONB column (locked decision #4).
 */

export const GENERATE_WORK_ORDER_FILE_TOPIC =
  "flooring.work-order.file-generation.requested" as const
export const GENERATE_WORK_ORDER_FILE_QUEUE =
  "flooring-work-order-file-generation" as const
export const GENERATE_WORK_ORDER_FILE_JOB_NAME = "generate" as const

const isoTimestamp = z.string().datetime()

export const GenerateWorkOrderFilePayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(GENERATE_WORK_ORDER_FILE_TOPIC),
  workOrderId: z.string().uuid(),
  fileId: z.string().uuid(),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type GenerateWorkOrderFilePayload = z.infer<
  typeof GenerateWorkOrderFilePayloadSchema
>

export function parseGenerateWorkOrderFilePayload(
  value: unknown,
): GenerateWorkOrderFilePayload {
  return GenerateWorkOrderFilePayloadSchema.parse(value)
}
