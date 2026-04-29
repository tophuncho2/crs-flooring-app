import {
  WorkOrderFileExecutionError,
  generateWorkOrderFileUseCase,
} from "@builders/application"
import type { StorageEnvironment } from "@builders/lib"
import {
  parseGenerateWorkOrderFilePayload,
  type GenerateWorkOrderFilePayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.work-order.file-generation.requested`
 * topic.
 *
 * The application use case handles its own failure markers (it flips
 * the file row to FAILED and the WO row to FAILED in a fresh TX before
 * the throw). The worker just classifies:
 *  - `WorkOrderFileExecutionError` → `UnrecoverableError` (terminal,
 *    no retry, surfaces in Bull Board).
 *  - Anything else → propagate so BullMQ retries.
 *
 * Storage env is required at construction time — the worker bootstrap
 * loads it once via `getWorkerStorageEnvironment(env)` and passes it
 * here. Application-package CLAUDE.md forbids reading `process.env` in
 * use cases, so injection is the canonical wiring.
 */

export type WorkOrderFileGenerationResult = Awaited<
  ReturnType<typeof generateWorkOrderFileUseCase>
>

export type WorkOrderFileGenerationHandlerDependencies = {
  generateFile: typeof generateWorkOrderFileUseCase
  parsePayload: typeof parseGenerateWorkOrderFilePayload
}

const defaultDependencies: WorkOrderFileGenerationHandlerDependencies = {
  generateFile: generateWorkOrderFileUseCase,
  parsePayload: parseGenerateWorkOrderFilePayload,
}

export function createWorkOrderFileGenerationHandler(input: {
  storageEnv: StorageEnvironment
  dependencies?: WorkOrderFileGenerationHandlerDependencies
}) {
  const dependencies = input.dependencies ?? defaultDependencies
  const storageEnv = input.storageEnv

  return async function processWorkOrderFileGenerationJob(
    job: { data: unknown },
  ): Promise<WorkOrderFileGenerationResult> {
    const payload: GenerateWorkOrderFilePayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.generateFile({
        workOrderId: payload.workOrderId,
        fileId: payload.fileId,
        storageEnv,
      })
    } catch (error) {
      if (error instanceof WorkOrderFileExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
