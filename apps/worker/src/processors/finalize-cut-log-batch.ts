import {
  CutLogExecutionError,
  finalizeCutLogsUseCase,
} from "@builders/application"
import {
  parseFinalizeCutLogBatchPayload,
  type FinalizeCutLogBatchPayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.cut-log.finalize` topic.
 *
 * Parses the job payload, calls the finalize use case, and classifies
 * thrown errors:
 * - `CutLogExecutionError` → `UnrecoverableError` (terminal — no retry,
 *   surfaces in Bull Board).
 * - Anything else → propagate. BullMQ retries per its job options.
 *
 * The use case is naturally idempotent: precondition-checks that every
 * row in the batch is still QUEUED + finalizable. A duplicate job hits
 * rows already in FINAL state and dead-letters cleanly via
 * `CUT_LOG_BATCH_INELIGIBLE` / `CUT_LOG_PRECONDITION_FAILED`.
 */

export type FinalizeCutLogBatchResult = Awaited<
  ReturnType<typeof finalizeCutLogsUseCase>
>

export type FinalizeCutLogBatchHandlerDependencies = {
  finalizeCutLogs: typeof finalizeCutLogsUseCase
  parsePayload: typeof parseFinalizeCutLogBatchPayload
}

const defaultDependencies: FinalizeCutLogBatchHandlerDependencies = {
  finalizeCutLogs: finalizeCutLogsUseCase,
  parsePayload: parseFinalizeCutLogBatchPayload,
}

export function createFinalizeCutLogBatchHandler(
  dependencies: FinalizeCutLogBatchHandlerDependencies = defaultDependencies,
) {
  return async function processFinalizeCutLogBatchJob(
    job: { data: unknown },
  ): Promise<FinalizeCutLogBatchResult> {
    const payload: FinalizeCutLogBatchPayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.finalizeCutLogs(payload)
    } catch (error) {
      if (error instanceof CutLogExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
