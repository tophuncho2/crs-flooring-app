import {
  StagedInventoryExecutionError,
  materializeImportedStagedRowsUseCase,
} from "@builders/application"
import {
  parseImportMaterializeBatchPayload,
  type ImportMaterializeBatchPayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.imports.materialize` topic.
 *
 * Parses the job payload, calls the materialize use case, and classifies
 * thrown errors:
 * - `StagedInventoryExecutionError` → `UnrecoverableError` (terminal —
 *   landing in BullMQ's failed set with no retry, surfaces in Bull Board).
 * - Anything else (Prisma transport blip, Redis hiccup) → propagate.
 *   BullMQ retries per its job options.
 *
 * The use case is naturally idempotent: it precondition-checks that staged
 * rows are still in `QUEUED` status. A duplicate job hits zero rows and
 * dead-letters cleanly via `STAGED_MATERIALIZE_PRECONDITION_FAILED`.
 */

export type MaterializeImportBatchResult = Awaited<
  ReturnType<typeof materializeImportedStagedRowsUseCase>
>

export type MaterializeImportBatchHandlerDependencies = {
  materializeImportedStagedRows: typeof materializeImportedStagedRowsUseCase
  parsePayload: typeof parseImportMaterializeBatchPayload
}

const defaultDependencies: MaterializeImportBatchHandlerDependencies = {
  materializeImportedStagedRows: materializeImportedStagedRowsUseCase,
  parsePayload: parseImportMaterializeBatchPayload,
}

export function createMaterializeImportBatchHandler(
  dependencies: MaterializeImportBatchHandlerDependencies = defaultDependencies,
) {
  return async function processMaterializeImportBatchJob(
    job: { data: unknown },
  ): Promise<MaterializeImportBatchResult> {
    const payload: ImportMaterializeBatchPayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.materializeImportedStagedRows(payload)
    } catch (error) {
      if (error instanceof StagedInventoryExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
