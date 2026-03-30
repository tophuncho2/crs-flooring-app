import {
  createInvoiceGeneration,
  createQueueOutboxEvent,
  getWorkOrderInvoiceView,
  softDeleteInvoiceArtifact,
  supersedePendingInvoiceGenerations,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildInvoiceGenerationIdempotencyKey,
  INVOICE_GENERATION_AGGREGATE_TYPE,
  INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC,
  type InvoiceGenerationRequestedOutboxEventV1,
} from "@builders/domain"
import { createAppError } from "@/server/http/api-helpers"
import { bucketObjectExistsForKey, createPresignedBucketObjectUrlForKey } from "@/server/storage/s3"

export async function getWorkOrderInvoiceStatusUseCase(workOrderId: string) {
  return getWorkOrderInvoiceView(workOrderId)
}

export async function resolveWorkOrderInvoiceDownloadUrlUseCase(workOrderId: string) {
  const invoice = await getWorkOrderInvoiceView(workOrderId)

  if (!invoice.artifact) {
    throw createAppError("Invoice is not ready yet", { status: 409 })
  }

  const artifactExists = await bucketObjectExistsForKey(invoice.artifact.storageKey)
  if (!artifactExists) {
    await softDeleteInvoiceArtifact({
      artifactId: invoice.artifact.id,
    })
    throw createAppError("Invoice artifact is missing from storage. Generate the invoice again.", {
      status: 409,
      field: "invoice",
    })
  }

  return createPresignedBucketObjectUrlForKey(invoice.artifact.storageKey)
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
