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
 *   BullMQ retries per its job options (attempts/backoff set at enqueue).
 *
 * The use case is naturally idempotent via subset-materialize: it processes
 * only the still-QUEUED rows and treats rows already IMPORTED (or reset to
 * DRAFT) as already-handled skips. So a duplicate / retried / reclaimed job is
 * a clean no-op SUCCESS, not a dead-letter. It still fails terminal only for
 * genuine anomalies (a requested id absent from the import, or a QUEUED row
 * missing its unit FK).
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
