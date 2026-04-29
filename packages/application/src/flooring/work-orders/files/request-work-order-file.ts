import {
  Prisma,
  createQueueOutboxEvent,
  createWorkOrderFile,
  getWorkOrderById,
  markWorkOrderStatus,
  withDatabaseTransaction,
} from "@builders/db"
import {
  GENERATE_WORK_ORDER_FILE_TOPIC,
  GenerateWorkOrderFilePayloadSchema,
  WORK_ORDER_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { WorkOrderFileExecutionError } from "./errors.js"
import type { RequestWorkOrderFileInput, RequestWorkOrderFileResult } from "./types.js"

/**
 * Producer for the file-generation flow. In a single TX:
 *   1. Verify the work order exists.
 *   2. Insert a new FlooringWorkOrderFile at status QUEUED. The data
 *      layer's `createWorkOrderFile` computes the next fileNumber as
 *      `max + 1` for this WO under the producer TX (BullMQ + the
 *      unique constraint `(workOrderId, fileNumber)` cover the race).
 *   3. Mark the WO row's `status` `IDLE → QUEUED` so the list view
 *      surfaces "file-gen queued" immediately.
 *   4. Write the outbox event with idempotency key
 *      `wo-file-gen:${workOrderId}:${fileId}` — re-firing this event is a
 *      no-op against the unique constraint.
 *
 * The PDF artifact in the bucket IS the file-gen snapshot per locked
 * decision #4 — no JSONB column, no snapshot tables.
 */
export async function requestWorkOrderFileUseCase(
  input: RequestWorkOrderFileInput,
  client?: Prisma.TransactionClient,
): Promise<RequestWorkOrderFileResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await getWorkOrderById(input.workOrderId, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderFileExecutionError({
          code: "WORK_ORDER_FILE_NOT_FOUND",
          message: WORK_ORDER_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    const file = await createWorkOrderFile(input.workOrderId, c)

    await markWorkOrderStatus(input.workOrderId, "QUEUED", c)

    const requestedAt = new Date().toISOString()
    const idempotencyKey = ["wo-file-gen", input.workOrderId, file.id].join(":")

    const payload = GenerateWorkOrderFilePayloadSchema.parse({
      version: "v1",
      topic: GENERATE_WORK_ORDER_FILE_TOPIC,
      workOrderId: input.workOrderId,
      fileId: file.id,
      requestedBy: input.requestedBy,
      requestedAt,
    })

    const { event, wasDuplicate } = await createQueueOutboxEvent(
      {
        topic: GENERATE_WORK_ORDER_FILE_TOPIC,
        aggregateType: "FlooringWorkOrder",
        aggregateId: input.workOrderId,
        idempotencyKey,
        payloadJson: payload as Prisma.InputJsonValue,
      },
      c,
    )

    return {
      fileId: file.id,
      fileNumber: file.fileNumber,
      outboxEventId: event.id,
      wasDuplicate,
    }
  })
}
