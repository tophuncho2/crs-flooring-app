import {
  CutLogExecutionError,
  voidCutLogUseCase,
} from "@builders/application"
import {
  parseVoidCutLogPayload,
  type VoidCutLogPayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.cut-log.void` topic.
 *
 * Parses the job payload, calls the void use case, and classifies
 * thrown errors:
 * - `CutLogExecutionError` → `UnrecoverableError` (terminal — no retry,
 *   surfaces in Bull Board).
 * - Anything else → propagate. BullMQ retries per its job options.
 *
 * Voids are always single-row per intent doc — no batch variant. The
 * use case is naturally idempotent: precondition-checks that the row
 * isn't already voided. A duplicate job hits a VOID row and
 * dead-letters via `CUT_LOG_VOID_NOT_ALLOWED`.
 */

export type VoidCutLogResult = Awaited<ReturnType<typeof voidCutLogUseCase>>

export type VoidCutLogHandlerDependencies = {
  voidCutLog: typeof voidCutLogUseCase
  parsePayload: typeof parseVoidCutLogPayload
}

const defaultDependencies: VoidCutLogHandlerDependencies = {
  voidCutLog: voidCutLogUseCase,
  parsePayload: parseVoidCutLogPayload,
}

export function createVoidCutLogHandler(
  dependencies: VoidCutLogHandlerDependencies = defaultDependencies,
) {
  return async function processVoidCutLogJob(
    job: { data: unknown },
  ): Promise<VoidCutLogResult> {
    const payload: VoidCutLogPayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.voidCutLog(payload)
    } catch (error) {
      if (error instanceof CutLogExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
