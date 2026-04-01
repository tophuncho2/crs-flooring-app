import { Prisma } from "@prisma/client"
import {
  buildInventoryAllocationTotals,
  buildWorkOrderAllocationPlan,
  calculateInventoryPricePerUnit,
  collectAffectedReservationInventoryIds,
  createTerminalWorkflowProcessingError,
  createWorkOrderAllocationDomainError,
  isWorkOrderAllocationDomainError,
  isWorkflowProcessingError,
  type AutoAllocateWorkOrderJobV1,
} from "@builders/domain"
import {
  completeWorkOrderAllocationRun,
  createWorkOrderItemAllocationRow,
  deleteAllAutoAllocationsForWorkOrder,
  failWorkOrderAllocationRun,
  getWorkOrderAutoAllocationSourceContext,
  getWorkOrderAllocationRunRowById,
  listWorkOrderAllocationInventoryIds,
  refreshInventoryReservedStockCounts,
  retryWorkOrderAllocationRun,
  startWorkOrderAllocationRun,
  supersedeWorkOrderAllocationRun,
  withDatabaseTransaction,
} from "@builders/db"
import { reconcileWorkOrderAllocationStatusesUseCase } from "./reconcile-allocation-statuses.js"

export type WorkOrderAutoAllocationAttemptContext = {
  attemptNumber: number
  maxAttempts: number
}

function classifyAllocationProcessingError(error: unknown) {
  if (isWorkflowProcessingError(error)) {
    return error
  }

  if (isWorkOrderAllocationDomainError(error)) {
    return createTerminalWorkflowProcessingError(error.code, error.message, "FAILED")
  }

  return error
}

export async function processWorkOrderAutoAllocationRunUseCase(
  job: AutoAllocateWorkOrderJobV1,
  attemptContext: WorkOrderAutoAllocationAttemptContext = { attemptNumber: 1, maxAttempts: 1 },
) {
  const allocationRun = await getWorkOrderAllocationRunRowById(job.allocationRunId)
  const claimed = await startWorkOrderAllocationRun(job.allocationRunId)

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
      allocationRun.sourceVersion.toISOString() !== job.sourceVersion
    ) {
      await failWorkOrderAllocationRun({
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
        await listWorkOrderAllocationInventoryIds(job.workOrderId, tx),
      )
      await deleteAllAutoAllocationsForWorkOrder(job.workOrderId, tx)
      const source = await getWorkOrderAutoAllocationSourceContext(job.allocationRunId, tx)

      if (!source.workOrder.warehouseId) {
        throw createWorkOrderAllocationDomainError({
          code: "WORK_ORDER_WAREHOUSE_REQUIRED",
          message: "Work order must have a warehouse before auto-allocation can run",
          field: "warehouseId",
        })
      }

      if (source.workOrder.updatedAt.toISOString() !== job.sourceVersion) {
        throw createTerminalWorkflowProcessingError(
          "AUTO_ALLOCATION_SUPERSEDED",
          "Work order changed after auto-allocation was requested",
          "SUPERSEDED",
        )
      }

      const allocationPlan = buildWorkOrderAllocationPlan({
        warehouseId: source.workOrder.warehouseId,
        items: source.workOrder.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          requiredQuantity: item.quantity.toString(),
          allocatedQuantity: item.allocations
            .filter((allocation) => allocation.method === "MANUAL")
            .reduce((total, allocation) => total + Number(allocation.quantity.toString()), 0),
        })),
        candidates: source.inventoryCandidates.map((candidate) => ({
          id: candidate.id,
          productId: candidate.productId,
          warehouseId: candidate.warehouseId,
          availableQuantity: buildInventoryAllocationTotals({
            stockCount: candidate.stockCount.toString(),
            cutTotal: candidate.cutTotal,
            reservedStockCount: candidate.reservedStockCount.toString(),
          }).availableToAllocate,
          fifoReceivedAt: candidate.fifoReceivedAt,
          itemNumber: candidate.itemNumber,
        })),
      })

      const inventoryById = new Map(source.inventoryCandidates.map((candidate) => [candidate.id, candidate]))

      for (const plannedAllocation of allocationPlan.rows) {
        const inventory = inventoryById.get(plannedAllocation.inventoryId)
        if (!inventory) {
          throw createTerminalWorkflowProcessingError(
            "AUTO_ALLOCATION_INVENTORY_MISSING",
            "Auto-allocation candidate inventory was not available at execution time",
            "FAILED",
          )
        }

        touchedInventoryIds.add(plannedAllocation.inventoryId)
        await createWorkOrderItemAllocationRow(
          {
            workOrderItemId: plannedAllocation.workOrderItemId,
            inventoryId: plannedAllocation.inventoryId,
            quantity: new Prisma.Decimal(plannedAllocation.quantity),
            method: "AUTO",
            unitCost: new Prisma.Decimal(
              calculateInventoryPricePerUnit({
                stockCount: inventory.stockCount.toString(),
                cost: inventory.cost?.toString() ?? null,
                freight: inventory.freight?.toString() ?? null,
              }),
            ),
          },
          tx,
        )
      }

      await refreshInventoryReservedStockCounts(
        collectAffectedReservationInventoryIds(Array.from(touchedInventoryIds)),
        tx,
      )

      await completeWorkOrderAllocationRun(
        {
          allocationRunId: job.allocationRunId,
          allocatedRowCount: allocationPlan.rows.length,
          shortageCount: allocationPlan.shortages.length,
        },
        tx,
      )

      await reconcileWorkOrderAllocationStatusesUseCase(source.workOrder.id, tx)

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
        await supersedeWorkOrderAllocationRun({
          allocationRunId: job.allocationRunId,
        })

        return {
          status: "superseded" as const,
          reason: classifiedError.code,
        }
      }

      await failWorkOrderAllocationRun({
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
      await retryWorkOrderAllocationRun({
        allocationRunId: job.allocationRunId,
        queuedAt: new Date(),
        failureCode: "AUTO_ALLOCATION_RETRY_PENDING",
        failureMessage: message,
      })
    } else {
      await failWorkOrderAllocationRun({
        allocationRunId: job.allocationRunId,
        failureCode: "AUTO_ALLOCATION_FAILED",
        failureMessage: message,
      })
    }

    throw error
  }
}
