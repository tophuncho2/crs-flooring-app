import {
  buildInventoryAllocationTotals,
  buildWorkOrderAllocationPlan,
  buildWorkOrderItemAllocationSummary,
  derivePersistedWorkOrderItemState,
  isWorkOrderAutoAllocationPendingStatus,
  type WorkOrderMaterialAllocationStatus,
} from "@builders/domain"
import {
  findWorkOrderAllocationRunRowBySourceVersion,
  getWorkOrderAllocationStatusContext,
  listAutoAllocationInventoryCandidateRows,
  setWorkOrderItemAllocationStates,
  type WorkOrderAllocationDbClient,
} from "@builders/db"

export async function reconcileWorkOrderAllocationStatusesUseCase(
  workOrderId: string,
  client?: WorkOrderAllocationDbClient,
) {
  const workOrder = await getWorkOrderAllocationStatusContext(workOrderId, client)
  const currentRun = await findWorkOrderAllocationRunRowBySourceVersion(workOrder.id, workOrder.updatedAt, client)
  const hasPendingRun = Boolean(currentRun && isWorkOrderAutoAllocationPendingStatus(currentRun.status))
  const canDeclareShortage = currentRun?.status === "COMPLETED"
  const shortageItemIds = new Set<string>()

  if (canDeclareShortage && workOrder.warehouseId) {
    const inventoryCandidates = await listAutoAllocationInventoryCandidateRows(workOrder.id, client)
    const allocationPlan = buildWorkOrderAllocationPlan({
      warehouseId: workOrder.warehouseId,
      items: workOrder.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        requiredQuantity: item.quantity.toString(),
        allocatedQuantity: item.allocations.reduce(
          (total, allocation) => total + Number(allocation.quantity.toString()),
          0,
        ),
      })),
      candidates: inventoryCandidates.map((candidate) => ({
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

    for (const shortage of allocationPlan.shortages) {
      shortageItemIds.add(shortage.workOrderItemId)
    }
  }

  const states = workOrder.items.map((item) => {
    const status = buildWorkOrderItemAllocationSummary({
      requiredQuantity: item.quantity.toString(),
      allocations: item.allocations.map((allocation) => ({
        quantity: allocation.quantity.toString(),
        unitCost: allocation.unitCost.toString(),
      })),
      hasPendingAllocationRun: hasPendingRun,
      hasEligibleInventoryRemaining: canDeclareShortage ? !shortageItemIds.has(item.id) : undefined,
    }).allocationStatus satisfies WorkOrderMaterialAllocationStatus

    return {
      itemId: item.id,
      ...derivePersistedWorkOrderItemState(status),
    }
  })

  await setWorkOrderItemAllocationStates(states, client)
  return states
}
