import {
  claimQueueOutboxEvent,
  exhaustQueueOutboxEvent,
  failWorkOrderAllocationRun,
  listClaimableQueueOutboxEvents,
  markQueueOutboxEventDispatched,
  queueWorkOrderAllocationRun,
  retryQueueOutboxEvent,
  withDatabaseTransaction,
  type QueueOutboxEventRecord,
} from "@builders/db"
import {
  AUTO_ALLOCATE_WORK_ORDER_JOB,
  calculateOutboxRetryAvailableAt,
  parseWorkOrderAutoAllocationRequestedOutboxEvent,
  WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
  WORK_ORDER_AUTO_ALLOCATION_RETRY_POLICY,
  type AutoAllocateWorkOrderJobV1,
} from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import type { Queue } from "bullmq"
import type { RelayEnvironment } from "../env.js"
import { addBullMqJobIdempotently } from "./bullmq-idempotent-dispatch.js"
import { toBullMqJobId } from "./bullmq-job-id.js"

export type WorkOrderAllocationOutboxDispatcherDependencies = {
  listClaimableEvents: typeof listClaimableQueueOutboxEvents
  claimEvent: typeof claimQueueOutboxEvent
  markEventDispatched: typeof markQueueOutboxEventDispatched
  retryEvent: typeof retryQueueOutboxEvent
  exhaustEvent: typeof exhaustQueueOutboxEvent
  queueRun: typeof queueWorkOrderAllocationRun
  failRun: typeof failWorkOrderAllocationRun
}

function defaultDependencies(): WorkOrderAllocationOutboxDispatcherDependencies {
  return {
    listClaimableEvents: listClaimableQueueOutboxEvents,
    claimEvent: claimQueueOutboxEvent,
    markEventDispatched: markQueueOutboxEventDispatched,
    retryEvent: retryQueueOutboxEvent,
    exhaustEvent: exhaustQueueOutboxEvent,
    queueRun: queueWorkOrderAllocationRun,
    failRun: failWorkOrderAllocationRun,
  }
}

function buildJobPayload(event: QueueOutboxEventRecord, queuedAt: Date): AutoAllocateWorkOrderJobV1 {
  const payload = parseWorkOrderAutoAllocationRequestedOutboxEvent(event.payloadJson)

  return {
    version: "v1",
    jobName: AUTO_ALLOCATE_WORK_ORDER_JOB,
    requestId: payload.requestId,
    allocationRunId: payload.allocationRunId,
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
  allocationRunId: string,
  error: Error,
  dependencies: WorkOrderAllocationOutboxDispatcherDependencies,
) {
  const shouldExhaust = event.attemptCount >= env.maxAttempts

  if (shouldExhaust) {
    await withDatabaseTransaction(async (tx) => {
      await dependencies.exhaustEvent({
        eventId: event.id,
        lastError: error.message,
      }, tx)
      await dependencies.failRun({
        allocationRunId,
        failureCode: "OUTBOX_DISPATCH_EXHAUSTED",
        failureMessage: error.message,
      }, tx)
    })
    return
  }

  await dependencies.retryEvent({
    eventId: event.id,
    availableAt: calculateOutboxRetryAvailableAt(event.attemptCount),
    lastError: error.message,
  })
}

export function createWorkOrderAllocationOutboxDispatcher(
  dependencies: WorkOrderAllocationOutboxDispatcherDependencies = defaultDependencies(),
) {
  return {
    async dispatchBatch(env: RelayEnvironment, queue: Queue<AutoAllocateWorkOrderJobV1>) {
      const now = new Date()
      const lockStaleBefore = new Date(now.getTime() - env.claimTtlMs)
      const candidates = await dependencies.listClaimableEvents({
        limit: env.batchSize,
        now,
        lockStaleBefore,
        topic: WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
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

        if (claimed.topic !== WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC) {
          await dependencies.exhaustEvent({
            eventId: claimed.id,
            lastError: `Unsupported outbox topic: ${claimed.topic}`,
          })
          continue
        }

        let jobPayload: AutoAllocateWorkOrderJobV1

        try {
          jobPayload = buildJobPayload(claimed, now)
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid outbox payload"
          await handleDispatchFailure(env, claimed, claimed.aggregateId, new Error(message), dependencies)
          continue
        }

        try {
          const queueJobId = toBullMqJobId(jobPayload.idempotencyKey)
          const { job, wasDuplicate } = await addBullMqJobIdempotently(queue, jobPayload.jobName, jobPayload, {
            ...WORK_ORDER_AUTO_ALLOCATION_RETRY_POLICY,
            jobId: queueJobId,
          })

          await withDatabaseTransaction(async (tx) => {
            await dependencies.queueRun({
              allocationRunId: jobPayload.allocationRunId,
              queueJobId: job.id ?? queueJobId,
              queuedAt: now,
            }, tx)
            await dependencies.markEventDispatched({
              eventId: claimed.id,
              dispatchedAt: now,
            }, tx)
          })

          dispatchedCount += 1

          logStructuredEvent({
            service: env.serviceName,
            environment: env.environmentName,
            message: "Work order auto-allocation job dispatched",
            action: "relay.workOrders.autoAllocation.dispatch",
            requestId: jobPayload.requestId,
            workOrderId: jobPayload.workOrderId,
            generationId: jobPayload.allocationRunId,
            idempotencyKey: jobPayload.idempotencyKey,
            queueJobId: job.id ?? queueJobId,
            status: "QUEUED",
            details: wasDuplicate ? { dispatchMode: "duplicate-job-reused" } : undefined,
          })
        } catch (error) {
          const wrappedError = error instanceof Error ? error : new Error("Failed to publish work-order auto-allocation job")
          await handleDispatchFailure(env, claimed, jobPayload.allocationRunId, wrappedError, dependencies)
          logStructuredEvent({
            level: "error",
            service: env.serviceName,
            environment: env.environmentName,
            message: "Work order auto-allocation dispatch failed",
            action: "relay.workOrders.autoAllocation.dispatch",
            requestId: jobPayload.requestId,
            workOrderId: jobPayload.workOrderId,
            generationId: jobPayload.allocationRunId,
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
