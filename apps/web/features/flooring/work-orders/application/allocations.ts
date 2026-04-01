import type { Prisma } from "@builders/db"
import {
  applyManualAllocationChangeUseCase,
  mapInventoryAllocationCandidateRowToOptionRecord,
  mapWorkOrderAllocationRunRowToRecord,
  mapWorkOrderItemAllocationRowToRecord,
  reconcileWorkOrderAllocationStatusesUseCase,
  removeWorkOrderItemAllocationUseCase,
  requestWorkOrderAutoAllocationUseCase as requestSharedWorkOrderAutoAllocationUseCase,
} from "@builders/application"
import {
  db,
  findActiveWorkOrderAllocationRunRow,
  findWorkOrderAllocationRunRowBySourceVersion,
  getWorkOrderAllocationRunRowById,
  listInventoryAllocationCandidateRowsForWorkOrderItem,
  listInventoryAllocationCandidateRowsForWorkOrderProduct,
  listWorkOrderItemAllocationRows,
  refreshInventoryReservedStockCounts,
  withDatabaseTransaction,
} from "@builders/db"
import { collectAffectedReservationInventoryIds } from "@builders/domain"
import { normalizeWorkOrderAllocationApplicationError } from "./allocation-errors"

export async function listWorkOrderItemAllocationsUseCase(workOrderId: string, workOrderItemId: string) {
  const rows = await listWorkOrderItemAllocationRows(workOrderId, workOrderItemId)
  return rows.map(mapWorkOrderItemAllocationRowToRecord)
}

export async function listInventoryAllocationOptionsUseCase(workOrderId: string, workOrderItemId: string) {
  const rows = await listInventoryAllocationCandidateRowsForWorkOrderItem(workOrderId, workOrderItemId)
  return rows
    .map(mapInventoryAllocationCandidateRowToOptionRecord)
    .filter((inventory) => inventory.availableToAllocate > 0)
}

export async function listInventoryAllocationOptionsForProductUseCase(workOrderId: string, productId: string) {
  const rows = await listInventoryAllocationCandidateRowsForWorkOrderProduct(workOrderId, productId)
  return rows
    .map(mapInventoryAllocationCandidateRowToOptionRecord)
    .filter((inventory) => inventory.availableToAllocate > 0)
}

export async function createWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  quantity: Prisma.Decimal
  cutSize?: string | null
  notes?: string | null
}) {
  try {
    return await withDatabaseTransaction(async (tx) => {
      const result = await applyManualAllocationChangeUseCase(
        {
          workOrderId: input.workOrderId,
          workOrderItemId: input.workOrderItemId,
          inventoryId: String(input.inventoryId),
          quantity: input.quantity,
          cutSize: input.cutSize,
          notes: input.notes,
        },
        tx,
      )

      await refreshInventoryReservedStockCounts(
        collectAffectedReservationInventoryIds(result.touchedInventoryIds),
        tx,
      )
      await reconcileWorkOrderAllocationStatusesUseCase(input.workOrderId, tx)

      return mapWorkOrderItemAllocationRowToRecord(result.allocation)
    })
  } catch (error) {
    normalizeWorkOrderAllocationApplicationError(error)
  }
}

export async function updateWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  allocationId: string
  inventoryId?: string
  quantity?: Prisma.Decimal
  cutSize?: string | null
  notes?: string | null
}) {
  try {
    return await withDatabaseTransaction(async (tx) => {
      const result = await applyManualAllocationChangeUseCase(
        {
          workOrderId: input.workOrderId,
          workOrderItemId: input.workOrderItemId,
          allocationId: input.allocationId,
          inventoryId: input.inventoryId,
          quantity: input.quantity,
          cutSize: input.cutSize,
          notes: input.notes,
        },
        tx,
      )

      await refreshInventoryReservedStockCounts(
        collectAffectedReservationInventoryIds(result.touchedInventoryIds),
        tx,
      )
      await reconcileWorkOrderAllocationStatusesUseCase(input.workOrderId, tx)

      return mapWorkOrderItemAllocationRowToRecord(result.allocation)
    })
  } catch (error) {
    normalizeWorkOrderAllocationApplicationError(error)
  }
}

export async function deleteWorkOrderItemAllocationUseCase(input: {
  workOrderId: string
  workOrderItemId: string
  allocationId: string
}) {
  try {
    await withDatabaseTransaction(async (tx) => {
      const result = await removeWorkOrderItemAllocationUseCase(input, tx)

      await refreshInventoryReservedStockCounts(
        collectAffectedReservationInventoryIds(result.touchedInventoryIds),
        tx,
      )
      await reconcileWorkOrderAllocationStatusesUseCase(input.workOrderId, tx)
    })
  } catch (error) {
    normalizeWorkOrderAllocationApplicationError(error)
  }
}

export async function getWorkOrderAutoAllocationStatusUseCase(workOrderId: string) {
  const workOrder = await db.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      updatedAt: true,
    },
  })

  const currentRun = await findWorkOrderAllocationRunRowBySourceVersion(workOrderId, workOrder.updatedAt)
  if (currentRun) {
    return mapWorkOrderAllocationRunRowToRecord(currentRun)
  }

  const activeRun = await findActiveWorkOrderAllocationRunRow(workOrderId)
  return activeRun ? mapWorkOrderAllocationRunRowToRecord(activeRun) : null
}

export async function requestWorkOrderAutoAllocationUseCase(input: {
  workOrderId: string
  triggeredByUserId: string
  requestId: string
}) {
  try {
    return await requestSharedWorkOrderAutoAllocationUseCase(input)
  } catch (error) {
    normalizeWorkOrderAllocationApplicationError(error)
  }
}

export async function getWorkOrderAutoAllocationRunByIdUseCase(allocationRunId: string) {
  return mapWorkOrderAllocationRunRowToRecord(await getWorkOrderAllocationRunRowById(allocationRunId))
}
