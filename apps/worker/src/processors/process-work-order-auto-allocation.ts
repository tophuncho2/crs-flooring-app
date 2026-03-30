import {
  createProcessWorkOrderAutoAllocationUseCase,
  type WorkOrderAutoAllocationApplicationDependencies as WorkOrderAutoAllocationProcessorDependencies,
} from "../application/process-work-order-auto-allocation.js"

export { type WorkOrderAutoAllocationProcessorDependencies }

export function createWorkOrderAutoAllocationProcessor(
  dependencies?: WorkOrderAutoAllocationProcessorDependencies,
) {
  return createProcessWorkOrderAutoAllocationUseCase(dependencies)
}
