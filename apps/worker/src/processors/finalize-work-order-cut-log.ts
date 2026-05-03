import {
  WorkOrderCutLogExecutionError,
  applyFinalizeWorkOrderCutLogUseCase,
} from "@builders/application"
import {
  parseFinalizeWorkOrderCutLogPayload,
  type FinalizeWorkOrderCutLogPayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.work-order.cut-log.finalize` topic.
 *
 * Single-row finalize: each job stamps `before` / `after` /
 * `finalCutSequence` on exactly one cut log under the parent inventory's
 * row lock. WOMI status is not touched by this flow.
 *
 * Error classification:
 *  - `WorkOrderCutLogExecutionError` → terminal. Wrapped as
 *    `UnrecoverableError` so BullMQ does not retry. The apply use case's
 *    TX has already rolled back; the cut log row stays in its prior
 *    state and the user can retry from the UI.
 *  - Anything else (transient DB / Redis errors) → re-thrown so BullMQ
 *    retries per the job's retry options.
 *
 * No compensating writes on failure. The TX rollback IS the failure
 * model.
 */

export type FinalizeWorkOrderCutLogResult = Awaited<
  ReturnType<typeof applyFinalizeWorkOrderCutLogUseCase>
>

export type FinalizeWorkOrderCutLogHandlerDependencies = {
  applyFinalize: typeof applyFinalizeWorkOrderCutLogUseCase
  parsePayload: typeof parseFinalizeWorkOrderCutLogPayload
}

const defaultDependencies: FinalizeWorkOrderCutLogHandlerDependencies = {
  applyFinalize: applyFinalizeWorkOrderCutLogUseCase,
  parsePayload: parseFinalizeWorkOrderCutLogPayload,
}

export function createFinalizeWorkOrderCutLogHandler(
  dependencies: FinalizeWorkOrderCutLogHandlerDependencies = defaultDependencies,
) {
  return async function processFinalizeWorkOrderCutLogJob(
    job: { data: unknown },
  ): Promise<FinalizeWorkOrderCutLogResult> {
    const payload: FinalizeWorkOrderCutLogPayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.applyFinalize(payload)
    } catch (error) {
      if (error instanceof WorkOrderCutLogExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
