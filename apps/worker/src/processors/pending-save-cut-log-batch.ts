import {
  CutLogExecutionError,
  applyCutLogPendingDiffUseCase,
} from "@builders/application"
import {
  parsePendingSaveCutLogBatchPayload,
  type PendingSaveCutLogBatchPayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.cut-log.pending-save` topic.
 *
 * Parses the job payload, calls the apply-pending-diff use case, and
 * classifies thrown errors:
 * - `CutLogExecutionError` → `UnrecoverableError` (terminal — landing
 *   in BullMQ's failed set with no retry, surfaces in Bull Board).
 * - Anything else (Prisma transport blip, Redis hiccup) → propagate.
 *   BullMQ retries per its job options.
 *
 * The use case is naturally idempotent: producer-stamped UUIDs ride in
 * the payload (`CutLogDraftPayload.id`), so a retried `createMany`
 * either succeeds (first run) or no-ops (subsequent runs hit the unique
 * pk constraint and the in-tx diff validator catches drift). The
 * `inventory.totalCutSum` recompute fold is also idempotent — the same
 * diff produces the same projected sum.
 */

export type PendingSaveCutLogBatchResult = Awaited<
  ReturnType<typeof applyCutLogPendingDiffUseCase>
>

export type PendingSaveCutLogBatchHandlerDependencies = {
  applyCutLogPendingDiff: typeof applyCutLogPendingDiffUseCase
  parsePayload: typeof parsePendingSaveCutLogBatchPayload
}

const defaultDependencies: PendingSaveCutLogBatchHandlerDependencies = {
  applyCutLogPendingDiff: applyCutLogPendingDiffUseCase,
  parsePayload: parsePendingSaveCutLogBatchPayload,
}

export function createPendingSaveCutLogBatchHandler(
  dependencies: PendingSaveCutLogBatchHandlerDependencies = defaultDependencies,
) {
  return async function processPendingSaveCutLogBatchJob(
    job: { data: unknown },
  ): Promise<PendingSaveCutLogBatchResult> {
    const payload: PendingSaveCutLogBatchPayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.applyCutLogPendingDiff(payload)
    } catch (error) {
      if (error instanceof CutLogExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
