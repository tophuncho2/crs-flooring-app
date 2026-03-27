import {
  type InventoryAllocationOptionRecord,
  Prisma,
  completeWorkOrderAllocationRun,
  createWorkOrderItemAllocation,
  deleteAllAutoAllocationsForWorkOrder,
  failWorkOrderAllocationRun,
  getWorkOrderAllocationRunById,
  getWorkOrderAutoAllocationSource,
  startWorkOrderAllocationRun,
  withDatabaseTransaction,
} from "@builders/db"
import type { AutoAllocateWorkOrderJobV1 } from "@builders/domain"
import type { WorkerEnvironment } from "../env.js"

export type WorkOrderAutoAllocationProcessorDependencies = {
  getAllocationRun: typeof getWorkOrderAllocationRunById
  getAllocationSource: typeof getWorkOrderAutoAllocationSource
  startAllocationRun: typeof startWorkOrderAllocationRun
  failAllocationRun: typeof failWorkOrderAllocationRun
  completeAllocationRun: typeof completeWorkOrderAllocationRun
  deleteAutoAllocationsForWorkOrder: typeof deleteAllAutoAllocationsForWorkOrder
  createAllocation: typeof createWorkOrderItemAllocation
}

function defaultDependencies(): WorkOrderAutoAllocationProcessorDependencies {
  return {
    getAllocationRun: getWorkOrderAllocationRunById,
    getAllocationSource: getWorkOrderAutoAllocationSource,
    startAllocationRun: startWorkOrderAllocationRun,
    failAllocationRun: failWorkOrderAllocationRun,
    completeAllocationRun: completeWorkOrderAllocationRun,
    deleteAutoAllocationsForWorkOrder: deleteAllAutoAllocationsForWorkOrder,
    createAllocation: createWorkOrderItemAllocation,
  }
}

function buildCandidateMap(
  candidates: InventoryAllocationOptionRecord[],
) {
  const byProductId = new Map<string, InventoryAllocationOptionRecord[]>()

  for (const candidate of candidates) {
    const existing = byProductId.get(candidate.productId) ?? []
    existing.push(candidate)
    byProductId.set(candidate.productId, existing)
  }

  return byProductId
}

export function createWorkOrderAutoAllocationProcessor(
  dependencies: WorkOrderAutoAllocationProcessorDependencies = defaultDependencies(),
) {
  return async function processWorkOrderAutoAllocation(
    job: AutoAllocateWorkOrderJobV1,
    _env: WorkerEnvironment,
  ) {
    const allocationRun = await dependencies.getAllocationRun(job.allocationRunId)
    const claimed = await dependencies.startAllocationRun(job.allocationRunId)

    if (!claimed) {
      return {
        status: "skipped" as const,
        reason: "allocation-run-unavailable",
      }
    }

    try {
      if (
        allocationRun.workOrderId !== job.workOrderId ||
        allocationRun.idempotencyKey !== job.idempotencyKey ||
        allocationRun.sourceVersion !== job.sourceVersion
      ) {
        await dependencies.failAllocationRun({
          allocationRunId: job.allocationRunId,
          failureCode: "INVALID_JOB_PAYLOAD",
          failureMessage: "Auto-allocation payload did not match the stored run state",
        })

        return {
          status: "skipped" as const,
          reason: "allocation-run-invalid-payload",
        }
      }

      const result = await withDatabaseTransaction(async (tx) => {
        await dependencies.deleteAutoAllocationsForWorkOrder(job.workOrderId, tx)
        const source = await dependencies.getAllocationSource(job.allocationRunId, tx)

        if (source.workOrder.sourceVersion !== job.sourceVersion) {
          throw new Error("Work order changed after auto-allocation was requested")
        }

        const candidatesByProductId = buildCandidateMap(source.inventoryCandidates)
        const availableByInventoryId = new Map(
          source.inventoryCandidates.map((candidate) => [candidate.id, candidate.availableToAllocate]),
        )

        let allocatedRowCount = 0
        let shortageCount = 0

        for (const item of source.items) {
          const manualAllocatedQuantity = item.manualAllocations.reduce(
            (total, allocation) => total + Number(allocation.quantity),
            0,
          )
          const remainingRequired = Math.max(0, Number(item.quantity) - manualAllocatedQuantity)

          if (remainingRequired <= 0) {
            continue
          }

          const candidates = candidatesByProductId.get(item.productId) ?? []
          const plannedAllocations: Array<{ inventoryId: string; quantity: number }> = []
          let remaining = remainingRequired

          for (const candidate of candidates) {
            const available = availableByInventoryId.get(candidate.id) ?? 0
            if (available <= 0 || remaining <= 0) {
              continue
            }

            const allocatedQuantity = Math.min(remaining, available)
            plannedAllocations.push({
              inventoryId: candidate.id,
              quantity: allocatedQuantity,
            })
            remaining -= allocatedQuantity
          }

          if (remaining > 0) {
            shortageCount += 1
            continue
          }

          for (const plannedAllocation of plannedAllocations) {
            await dependencies.createAllocation(
              {
                workOrderId: source.workOrder.id,
                workOrderItemId: item.id,
                inventoryId: plannedAllocation.inventoryId,
                quantity: new Prisma.Decimal(plannedAllocation.quantity),
                method: "AUTO",
              },
              tx,
            )
            allocatedRowCount += 1
            availableByInventoryId.set(
              plannedAllocation.inventoryId,
              (availableByInventoryId.get(plannedAllocation.inventoryId) ?? 0) - plannedAllocation.quantity,
            )
          }
        }

        await dependencies.completeAllocationRun(
          {
            allocationRunId: job.allocationRunId,
            allocatedRowCount,
            shortageCount,
          },
          tx,
        )

        return {
          allocatedRowCount,
          shortageCount,
        }
      })

      return {
        status: "completed" as const,
        allocatedRowCount: result.allocatedRowCount,
        shortageCount: result.shortageCount,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Work-order auto-allocation failed"
      await dependencies.failAllocationRun({
        allocationRunId: job.allocationRunId,
        failureCode: "AUTO_ALLOCATION_FAILED",
        failureMessage: message,
      })
      throw error
    }
  }
}
