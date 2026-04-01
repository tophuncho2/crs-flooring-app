import {
  processWorkOrderAutoAllocationRunUseCase,
  type WorkOrderAutoAllocationAttemptContext,
} from "@builders/application"
import type { AutoAllocateWorkOrderJobV1 } from "@builders/domain"
import type { WorkerEnvironment } from "../env.js"

export { type WorkOrderAutoAllocationAttemptContext }

export function createProcessWorkOrderAutoAllocationUseCase() {
  return async function processWorkOrderAutoAllocation(
    job: AutoAllocateWorkOrderJobV1,
    _env: WorkerEnvironment,
    attemptContext: WorkOrderAutoAllocationAttemptContext = { attemptNumber: 1, maxAttempts: 1 },
  ) {
    return processWorkOrderAutoAllocationRunUseCase(job, attemptContext)
  }
}
