import {
  createInvoiceGeneration,
  createQueueOutboxEvent,
  getWorkOrderInvoiceView,
  supersedePendingInvoiceGenerations,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildInvoiceGenerationIdempotencyKey,
  INVOICE_GENERATION_AGGREGATE_TYPE,
  INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC,
  type InvoiceGenerationRequestedOutboxEventV1,
} from "@builders/domain"

export async function getWorkOrderInvoiceStatusUseCase(workOrderId: string) {
  return getWorkOrderInvoiceView(workOrderId)
}

export async function queueWorkOrderInvoiceUseCase(input: {
  workOrderId: string
  triggeredByUserId: string
  requestId: string
}) {
  return withDatabaseTransaction(async (tx) => {
    const current = await getWorkOrderInvoiceView(input.workOrderId, tx)

    if (current.generation) {
      return current
    }

    const now = new Date()
    const idempotencyKey = buildInvoiceGenerationIdempotencyKey(input.workOrderId, current.sourceVersion)

    await supersedePendingInvoiceGenerations(
      {
        workOrderId: input.workOrderId,
        supersededAt: now,
      },
      tx,
    )

    const generation = await createInvoiceGeneration(
      {
        workOrderId: input.workOrderId,
        requestedByUserId: input.triggeredByUserId,
        sourceVersion: new Date(current.sourceVersion),
        idempotencyKey,
        requestId: input.requestId,
        requestedAt: now,
      },
      tx,
    )

    const outboxPayload: InvoiceGenerationRequestedOutboxEventV1 = {
      version: "v1",
      topic: INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC,
      requestId: input.requestId,
      generationId: generation.id,
      workOrderId: input.workOrderId,
      requestedByUserId: input.triggeredByUserId,
      idempotencyKey,
      sourceVersion: current.sourceVersion,
      requestedAt: now.toISOString(),
    }

    await createQueueOutboxEvent(
      {
        topic: INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC,
        aggregateType: INVOICE_GENERATION_AGGREGATE_TYPE,
        aggregateId: generation.id,
        idempotencyKey,
        payloadJson: outboxPayload,
        availableAt: now,
      },
      tx,
    )

    return {
      ...current,
      generation,
    }
  })
}
