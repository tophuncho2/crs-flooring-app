import {
  claimQueueOutboxEvent,
  exhaustQueueOutboxEvent,
  failInvoiceGeneration,
  listClaimableQueueOutboxEvents,
  markQueueOutboxEventDispatched,
  queueInvoiceGeneration,
  retryQueueOutboxEvent,
  withDatabaseTransaction,
  type QueueOutboxEventRecord,
} from "@builders/db"
import {
  calculateOutboxRetryAvailableAt,
  GENERATE_WORK_ORDER_INVOICE_JOB,
  parseInvoiceGenerationRequestedOutboxEvent,
  INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC,
  INVOICE_GENERATION_RETRY_POLICY,
  type GenerateWorkOrderInvoiceJobV1,
} from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import type { Queue } from "bullmq"
import type { RelayEnvironment } from "../env.js"

export type InvoiceOutboxDispatcherDependencies = {
  listClaimableEvents: typeof listClaimableQueueOutboxEvents
  claimEvent: typeof claimQueueOutboxEvent
  markEventDispatched: typeof markQueueOutboxEventDispatched
  retryEvent: typeof retryQueueOutboxEvent
  exhaustEvent: typeof exhaustQueueOutboxEvent
  queueGeneration: typeof queueInvoiceGeneration
  failGeneration: typeof failInvoiceGeneration
}

function defaultDependencies(): InvoiceOutboxDispatcherDependencies {
  return {
    listClaimableEvents: listClaimableQueueOutboxEvents,
    claimEvent: claimQueueOutboxEvent,
    markEventDispatched: markQueueOutboxEventDispatched,
    retryEvent: retryQueueOutboxEvent,
    exhaustEvent: exhaustQueueOutboxEvent,
    queueGeneration: queueInvoiceGeneration,
    failGeneration: failInvoiceGeneration,
  }
}

function buildJobPayload(event: QueueOutboxEventRecord, queuedAt: Date): GenerateWorkOrderInvoiceJobV1 {
  const payload = parseInvoiceGenerationRequestedOutboxEvent(event.payloadJson)

  return {
    version: "v1",
    jobName: GENERATE_WORK_ORDER_INVOICE_JOB,
    requestId: payload.requestId,
    generationId: payload.generationId,
    workOrderId: payload.workOrderId,
    requestedByUserId: payload.requestedByUserId,
    idempotencyKey: payload.idempotencyKey,
    sourceVersion: payload.sourceVersion,
    queuedAt: queuedAt.toISOString(),
  }
}

async function handleDispatchFailure(
  env: RelayEnvironment,
  event: QueueOutboxEventRecord,
  generationId: string,
  error: Error,
  dependencies: InvoiceOutboxDispatcherDependencies,
) {
  const shouldExhaust = event.attemptCount >= env.maxAttempts

  if (shouldExhaust) {
    await withDatabaseTransaction(async (tx) => {
      await dependencies.exhaustEvent(
        {
          eventId: event.id,
          lastError: error.message,
        },
        tx,
      )
      await dependencies.failGeneration(
        {
          generationId,
          failureCode: "OUTBOX_DISPATCH_EXHAUSTED",
          failureMessage: error.message,
        },
        tx,
      )
    })
    return
  }

  await dependencies.retryEvent({
    eventId: event.id,
    availableAt: calculateOutboxRetryAvailableAt(event.attemptCount),
    lastError: error.message,
  })
}

export function createInvoiceOutboxDispatcher(
  dependencies: InvoiceOutboxDispatcherDependencies = defaultDependencies(),
) {
  return {
    async dispatchBatch(env: RelayEnvironment, queue: Queue<GenerateWorkOrderInvoiceJobV1>) {
      const now = new Date()
      const lockStaleBefore = new Date(now.getTime() - env.claimTtlMs)
      const candidates = await dependencies.listClaimableEvents({
        limit: env.batchSize,
        now,
        lockStaleBefore,
      })

      let dispatchedCount = 0

      for (const candidate of candidates) {
        const claimed = await dependencies.claimEvent({
          eventId: candidate.id,
          lockedAt: now,
          lockedBy: env.serviceName,
          lockStaleBefore,
        })

        if (!claimed) {
          continue
        }

        if (claimed.topic !== INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC) {
          await dependencies.exhaustEvent({
            eventId: claimed.id,
            lastError: `Unsupported outbox topic: ${claimed.topic}`,
          })
          continue
        }

        let jobPayload: GenerateWorkOrderInvoiceJobV1

        try {
          jobPayload = buildJobPayload(claimed, now)
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid outbox payload"
          await handleDispatchFailure(env, claimed, claimed.aggregateId, new Error(message), dependencies)
          continue
        }

        try {
          const job = await queue.add(jobPayload.jobName, jobPayload, {
            ...INVOICE_GENERATION_RETRY_POLICY,
            jobId: jobPayload.idempotencyKey,
          })

          await withDatabaseTransaction(async (tx) => {
            await dependencies.queueGeneration(
              {
                generationId: jobPayload.generationId,
                queueJobId: job.id ?? jobPayload.idempotencyKey,
                queuedAt: now,
              },
              tx,
            )
            await dependencies.markEventDispatched(
              {
                eventId: claimed.id,
                dispatchedAt: now,
              },
              tx,
            )
          })

          dispatchedCount += 1

          logStructuredEvent({
            service: env.serviceName,
            environment: env.environmentName,
            message: "Invoice generation job dispatched",
            action: "relay.invoice.dispatch",
            requestId: jobPayload.requestId,
            workOrderId: jobPayload.workOrderId,
            generationId: jobPayload.generationId,
            idempotencyKey: jobPayload.idempotencyKey,
            queueJobId: job.id ?? jobPayload.idempotencyKey,
            status: "QUEUED",
          })
        } catch (error) {
          const wrappedError = error instanceof Error ? error : new Error("Failed to publish invoice job")
          await handleDispatchFailure(env, claimed, jobPayload.generationId, wrappedError, dependencies)
          logStructuredEvent({
            level: "error",
            service: env.serviceName,
            environment: env.environmentName,
            message: "Invoice generation dispatch failed",
            action: "relay.invoice.dispatch",
            requestId: jobPayload.requestId,
            workOrderId: jobPayload.workOrderId,
            generationId: jobPayload.generationId,
            idempotencyKey: jobPayload.idempotencyKey,
            status: "FAILED",
            error: wrappedError,
          })
        }
      }

      return {
        scannedCount: candidates.length,
        dispatchedCount,
      }
    },
  }
}
