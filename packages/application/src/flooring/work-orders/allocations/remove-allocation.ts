import {
  assertAllocationBelongsToWorkOrderItem,
} from "@builders/domain"
import {
  db,
  deleteWorkOrderItemAllocationRow,
  getWorkOrderItemAllocationContext,
  getWorkOrderItemAllocationOwnership,
  lockInventoryRows,
  type WorkOrderAllocationDbClient,
} from "@builders/db"
import { WorkOrderAllocationExecutionError } from "./errors.js"

export async function removeWorkOrderItemAllocationUseCase(
  input: {
    workOrderId: string
    workOrderItemId: string
    allocationId: string
  },
  client?: WorkOrderAllocationDbClient,
) {
  const item = await getWorkOrderItemAllocationContext(input.workOrderId, input.workOrderItemId, client)
  const allocation = await getWorkOrderItemAllocationOwnership(input.allocationId, client)

  if (!allocation) {
    throw new WorkOrderAllocationExecutionError({
      code: "ALLOCATION_NOT_FOUND",
      message: "Allocation not found",
      status: 404,
      field: "allocationId",
    })
  }

  assertAllocationBelongsToWorkOrderItem({
    expectedWorkOrderItemId: item.id,
    actualWorkOrderItemId: allocation.workOrderItemId,
  })

  await lockInventoryRows(client ?? db, [allocation.inventoryId])
  await deleteWorkOrderItemAllocationRow(allocation.id, client)

  return {
    touchedInventoryIds: [allocation.inventoryId],
  }
}
