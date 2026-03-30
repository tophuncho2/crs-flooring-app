import {
  Prisma,
  completeWorkOrderAllocationRun,
  createWorkOrderItemAllocation,
  deleteAllAutoAllocationsForWorkOrder,
  failWorkOrderAllocationRun,
  listWorkOrderAllocationInventoryIds,
  refreshInventoryReservedStockCounts,
  getWorkOrderAllocationRunById,
  getWorkOrderAutoAllocationSource,
  retryWorkOrderAllocationRun,
  startWorkOrderAllocationRun,
  supersedeWorkOrderAllocationRun,
  updateWorkOrderItemShortageStatuses,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildWorkOrderAllocationPlan,
  collectAffectedReservationInventoryIds,
  createTerminalWorkflowProcessingError,
  isWorkflowProcessingError,
  type AutoAllocateWorkOrderJobV1,
} from "@builders/domain"
import type { WorkerEnvironment } from "../env.js"

export type WorkOrderAutoAllocationApplicationDependencies = {
  getAllocationRun: typeof getWorkOrderAllocationRunById
  getAllocationSource: typeof getWorkOrderAutoAllocationSource
  startAllocationRun: typeof startWorkOrderAllocationRun
  retryAllocationRun: typeof retryWorkOrderAllocationRun
  failAllocationRun: typeof failWorkOrderAllocationRun
  supersedeAllocationRun: typeof supersedeWorkOrderAllocationRun
  completeAllocationRun: typeof completeWorkOrderAllocationRun
  deleteAutoAllocationsForWorkOrder: typeof deleteAllAutoAllocationsForWorkOrder
  createAllocation: typeof createWorkOrderItemAllocation
  updateItemShortageStatuses: typeof updateWorkOrderItemShortageStatuses
  listWorkOrderAllocationInventoryIds: typeof listWorkOrderAllocationInventoryIds
  refreshInventoryReservedStockCounts: typeof refreshInventoryReservedStockCounts
}

function defaultDependencies(): WorkOrderAutoAllocationApplicationDependencies {
  return {
    getAllocationRun: getWorkOrderAllocationRunById,
    getAllocationSource: getWorkOrderAutoAllocationSource,
    startAllocationRun: startWorkOrderAllocationRun,
    retryAllocationRun: retryWorkOrderAllocationRun,
    failAllocationRun: failWorkOrderAllocationRun,
    supersedeAllocationRun: supersedeWorkOrderAllocationRun,
    completeAllocationRun: completeWorkOrderAllocationRun,
    deleteAutoAllocationsForWorkOrder: deleteAllAutoAllocationsForWorkOrder,
    createAllocation: createWorkOrderItemAllocation,
    updateItemShortageStatuses: updateWorkOrderItemShortageStatuses,
    listWorkOrderAllocationInventoryIds,
    refreshInventoryReservedStockCounts,
  }
}

export type WorkOrderAutoAllocationAttemptContext = {
  attemptNumber: number
  maxAttempts: number
}

function classifyAllocationProcessingError(error: unknown) {
  if (isWorkflowProcessingError(error)) {
    return error
  }

  const message = error instanceof Error ? error.message : "Work-order auto-allocation failed"

  if (
    message.includes("must have a warehouse before auto-allocation can run") ||
    message.includes("Inventory row must match the material item product") ||
    message.includes("Inventory row must belong to the work order warehouse") ||
    message.includes("Allocation quantity exceeds")
  ) {
    return createTerminalWorkflowProcessingError("AUTO_ALLOCATION_INVARIANT_VIOLATION", message, "FAILED")
  }

  return error
}

export function createProcessWorkOrderAutoAllocationUseCase(
  dependencies: WorkOrderAutoAllocationApplicationDependencies = defaultDependencies(),
) {
  return async function processWorkOrderAutoAllocation(
    job: AutoAllocateWorkOrderJobV1,
    _env: WorkerEnvironment,
    attemptContext: WorkOrderAutoAllocationAttemptContext = { attemptNumber: 1, maxAttempts: 1 },
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
        const touchedInventoryIds = new Set(
          await dependencies.listWorkOrderAllocationInventoryIds(job.workOrderId, tx),
        )
        await dependencies.deleteAutoAllocationsForWorkOrder(job.workOrderId, tx)
        const source = await dependencies.getAllocationSource(job.allocationRunId, tx)

        if (source.workOrder.sourceVersion !== job.sourceVersion) {
          throw createTerminalWorkflowProcessingError(
            "AUTO_ALLOCATION_SUPERSEDED",
            "Work order changed after auto-allocation was requested",
            "SUPERSEDED",
          )
        }

        const allocationPlan = buildWorkOrderAllocationPlan({
          warehouseId: source.workOrder.warehouseId,
          items: source.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            requiredQuantity: item.quantity,
            allocatedQuantity: item.manualAllocations.reduce(
              (total, allocation) => total + Number(allocation.quantity),
              0,
            ),
          })),
          candidates: source.inventoryCandidates.map((candidate) => ({
            id: candidate.id,
            productId: candidate.productId,
            warehouseId: candidate.warehouseId,
            availableQuantity: candidate.availableToAllocate,
            fifoReceivedAt: candidate.fifoReceivedAt,
            itemNumber: candidate.itemNumber,
          })),
        })

        for (const plannedAllocation of allocationPlan.rows) {
          touchedInventoryIds.add(plannedAllocation.inventoryId)
          await dependencies.createAllocation(
            {
              workOrderId: source.workOrder.id,
              workOrderItemId: plannedAllocation.workOrderItemId,
              inventoryId: plannedAllocation.inventoryId,
              quantity: new Prisma.Decimal(plannedAllocation.quantity),
              method: "AUTO",
            },
            tx,
          )
        }

        await dependencies.refreshInventoryReservedStockCounts(
          collectAffectedReservationInventoryIds(Array.from(touchedInventoryIds)),
          tx,
        )

        await dependencies.updateItemShortageStatuses(
          {
            workOrderId: source.workOrder.id,
            shortageItemIds: allocationPlan.shortages.map((shortage) => shortage.workOrderItemId),
          },
          tx,
        )

        await dependencies.completeAllocationRun(
          {
            allocationRunId: job.allocationRunId,
            allocatedRowCount: allocationPlan.rows.length,
            shortageCount: allocationPlan.shortages.length,
          },
          tx,
        )

        return {
          allocatedRowCount: allocationPlan.rows.length,
          shortageCount: allocationPlan.shortages.length,
        }
      })

      return {
        status: "completed" as const,
        allocatedRowCount: result.allocatedRowCount,
        shortageCount: result.shortageCount,
      }
    } catch (error) {
      const classifiedError = classifyAllocationProcessingError(error)
      const message = classifiedError instanceof Error ? classifiedError.message : "Work-order auto-allocation failed"

      if (isWorkflowProcessingError(classifiedError) && !classifiedError.retryable) {
        if (classifiedError.terminalStatus === "SUPERSEDED") {
          await dependencies.supersedeAllocationRun({
            allocationRunId: job.allocationRunId,
          })

          return {
            status: "superseded" as const,
            reason: classifiedError.code,
          }
        }

        await dependencies.failAllocationRun({
          allocationRunId: job.allocationRunId,
          failureCode: classifiedError.code,
          failureMessage: message,
        })

        return {
          status: "failed" as const,
          reason: classifiedError.code,
        }
      }

      const hasRemainingAttempts = attemptContext.attemptNumber < attemptContext.maxAttempts

      if (hasRemainingAttempts) {
        await dependencies.retryAllocationRun({
          allocationRunId: job.allocationRunId,
          queuedAt: new Date(),
          failureCode: "AUTO_ALLOCATION_RETRY_PENDING",
          failureMessage: message,
        })
      } else {
        await dependencies.failAllocationRun({
          allocationRunId: job.allocationRunId,
          failureCode: "AUTO_ALLOCATION_FAILED",
          failureMessage: message,
        })
      }

      throw error
    }
  }
}
