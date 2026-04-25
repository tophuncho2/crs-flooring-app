import {
  claimQueueOutboxEvent,
  exhaustQueueOutboxEvent,
  listClaimableQueueOutboxEvents,
  markQueueOutboxEventDispatched,
  retryQueueOutboxEvent,
  type QueueOutboxEventRecord,
} from "@builders/db"
import { logStructuredEvent } from "@builders/lib"
import type { Queue } from "bullmq"
import type { RelayEnvironment } from "../env.js"
import { addBullMqJobIdempotently } from "./bullmq-idempotent-dispatch.js"

/**
 * Generic per-topic outbox → BullMQ dispatcher.
 *
 * Contract: claim a batch of outbox events filtered to `dispatcher.topic`,
 * parse each payload via `dispatcher.parsePayload`, enqueue idempotently to
 * `dispatcher.queue`, mark the outbox row DISPATCHED. On enqueue failure:
 * retry with exponential backoff until `env.maxAttempts`, then exhaust.
 * Payload-parse failures are treated as poison messages and exhaust
 * immediately (retrying a malformed payload won't help).
 *
 * `DISPATCHED` here means "BullMQ accepted the job" — worker retries are
 * BullMQ-internal and don't touch the outbox.
 */

const RETRY_BACKOFF_BASE_MS = 30_000
const RETRY_BACKOFF_MAX_MS = 15 * 60 * 1_000

function calculateRetryAvailableAt(attemptCount: number, now: Date) {
  const exponent = Math.max(attemptCount - 1, 0)
  const delayMs = Math.min(RETRY_BACKOFF_BASE_MS * 2 ** exponent, RETRY_BACKOFF_MAX_MS)
  return new Date(now.getTime() + delayMs)
}

export type TopicDispatcher<TPayload> = {
  topic: string
  jobName: string
  queue: Queue<TPayload>
  parsePayload: (raw: unknown) => TPayload
  buildJobId: (payload: TPayload, event: QueueOutboxEventRecord) => string
  close: () => Promise<void>
}

export type TopicDispatcherDependencies = {
  listClaimableEvents: typeof listClaimableQueueOutboxEvents
  claimEvent: typeof claimQueueOutboxEvent
  markEventDispatched: typeof markQueueOutboxEventDispatched
  retryEvent: typeof retryQueueOutboxEvent
  exhaustEvent: typeof exhaustQueueOutboxEvent
}

const defaultDependencies: TopicDispatcherDependencies = {
  listClaimableEvents: listClaimableQueueOutboxEvents,
  claimEvent: claimQueueOutboxEvent,
  markEventDispatched: markQueueOutboxEventDispatched,
  retryEvent: retryQueueOutboxEvent,
  exhaustEvent: exhaustQueueOutboxEvent,
}

export type DispatchBatchResult = {
  scannedCount: number
  dispatchedCount: number
}

export async function dispatchBatchForTopic<TPayload>(
  env: RelayEnvironment,
  dispatcher: TopicDispatcher<TPayload>,
  dependencies: TopicDispatcherDependencies = defaultDependencies,
): Promise<DispatchBatchResult> {
  const now = new Date()
  const lockStaleBefore = new Date(now.getTime() - env.claimTtlMs)
  const candidates = await dependencies.listClaimableEvents({
    limit: env.batchSize,
    now,
    lockStaleBefore,
    topic: dispatcher.topic,
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

    let payload: TPayload
    try {
      payload = dispatcher.parsePayload(claimed.payloadJson)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid outbox payload"
      await dependencies.exhaustEvent({ eventId: claimed.id, lastError: message })
      logStructuredEvent({
        level: "error",
        service: env.serviceName,
        environment: env.environmentName,
        message: "Outbox event payload parse failed; exhausted",
        action: "outbox.event.exhausted",
        idempotencyKey: claimed.idempotencyKey,
        details: {
          outboxEventId: claimed.id,
          eventType: claimed.topic,
          attempts: claimed.attemptCount,
          lastError: message,
        },
      })
      continue
    }

    try {
      const jobId = dispatcher.buildJobId(payload, claimed)
      // BullMQ's Queue<TPayload> uses inference helpers (ExtractNameType, etc.)
      // that don't simplify under a generic TPayload here. The cast collapses
      // them to the structural QueueLike that `addBullMqJobIdempotently` wants.
      const { job, wasDuplicate } = await addBullMqJobIdempotently(
        dispatcher.queue as unknown as Parameters<typeof addBullMqJobIdempotently<TPayload>>[0],
        dispatcher.jobName,
        payload,
        { jobId },
      )

      await dependencies.markEventDispatched({
        eventId: claimed.id,
        dispatchedAt: now,
      })

      dispatchedCount += 1

      logStructuredEvent({
        service: env.serviceName,
        environment: env.environmentName,
        message: "Outbox event dispatched",
        action: "outbox.event.dispatched",
        idempotencyKey: claimed.idempotencyKey,
        queueJobId: job.id ?? jobId,
        status: "QUEUED",
        details: {
          topic: claimed.topic,
          aggregateType: claimed.aggregateType,
          aggregateId: claimed.aggregateId,
          dispatchMode: wasDuplicate ? "duplicate-job-reused" : "fresh-enqueue",
        },
      })
    } catch (error) {
      const wrappedError =
        error instanceof Error ? error : new Error("Failed to enqueue outbox event")
      const nextAttempt = claimed.attemptCount + 1
      const shouldExhaust = nextAttempt >= env.maxAttempts

      if (shouldExhaust) {
        await dependencies.exhaustEvent({
          eventId: claimed.id,
          lastError: wrappedError.message,
        })
        logStructuredEvent({
          level: "error",
          service: env.serviceName,
          environment: env.environmentName,
          message: "Outbox event exhausted",
          action: "outbox.event.exhausted",
          idempotencyKey: claimed.idempotencyKey,
          details: {
            outboxEventId: claimed.id,
            eventType: claimed.topic,
            attempts: claimed.attemptCount,
            lastError: wrappedError.message,
          },
        })
      } else {
        await dependencies.retryEvent({
          eventId: claimed.id,
          availableAt: calculateRetryAvailableAt(claimed.attemptCount, now),
          lastError: wrappedError.message,
        })
        logStructuredEvent({
          level: "warn",
          service: env.serviceName,
          environment: env.environmentName,
          message: "Outbox event enqueue failed; scheduled for retry",
          action: "outbox.event.retry",
          idempotencyKey: claimed.idempotencyKey,
          details: {
            outboxEventId: claimed.id,
            eventType: claimed.topic,
            attempts: claimed.attemptCount,
            lastError: wrappedError.message,
          },
        })
      }
    }
  }

  return { scannedCount: candidates.length, dispatchedCount }
}
