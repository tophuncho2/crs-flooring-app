import {
  createProcessWorkOrderAutoAllocationUseCase,
} from "../application/process-work-order-auto-allocation.js"

export function createWorkOrderAutoAllocationProcessor() {
  return createProcessWorkOrderAutoAllocationUseCase()
}
