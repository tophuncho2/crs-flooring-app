import { toAllocationDateValue, toAllocationNumber } from "./shared.js"

export type WorkOrderAllocationCandidate = {
  id: string
  productId: string
  warehouseId: string
  availableQuantity: string | number
  fifoReceivedAt: string | Date
  itemNumber?: string | null
}

export type WorkOrderAllocationPlanInputItem = {
  id: string
  productId: string
  requiredQuantity: string | number
  allocatedQuantity?: string | number
}

export type WorkOrderAllocationPlanRow = {
  workOrderItemId: string
  inventoryId: string
  quantity: number
}

export type WorkOrderAllocationPlanResult = {
  rows: WorkOrderAllocationPlanRow[]
  shortages: Array<{
    workOrderItemId: string
    remainingQuantity: number
  }>
}

export function compareWorkOrderAllocationCandidatesByFifo(
  left: Pick<WorkOrderAllocationCandidate, "fifoReceivedAt" | "itemNumber" | "id">,
  right: Pick<WorkOrderAllocationCandidate, "fifoReceivedAt" | "itemNumber" | "id">,
) {
  const leftFifo = toAllocationDateValue(left.fifoReceivedAt).getTime()
  const rightFifo = toAllocationDateValue(right.fifoReceivedAt).getTime()

  if (leftFifo !== rightFifo) {
    return leftFifo - rightFifo
  }

  const leftItemNumber = (left.itemNumber ?? "").toString()
  const rightItemNumber = (right.itemNumber ?? "").toString()
  if (leftItemNumber !== rightItemNumber) {
    return leftItemNumber.localeCompare(rightItemNumber)
  }

  return left.id.localeCompare(right.id)
}

export function sortWorkOrderAllocationCandidatesByFifo<T extends WorkOrderAllocationCandidate>(candidates: T[]) {
  return [...candidates].sort(compareWorkOrderAllocationCandidatesByFifo)
}

export function buildWorkOrderAllocationPlan(input: {
  warehouseId: string
  items: WorkOrderAllocationPlanInputItem[]
  candidates: WorkOrderAllocationCandidate[]
}): WorkOrderAllocationPlanResult {
  const eligibleCandidates = sortWorkOrderAllocationCandidatesByFifo(
    input.candidates.filter((candidate) => candidate.warehouseId === input.warehouseId),
  )
  const rows: WorkOrderAllocationPlanRow[] = []
  const shortages: WorkOrderAllocationPlanResult["shortages"] = []
  const candidatesByProductId = new Map<string, WorkOrderAllocationCandidate[]>()
  const availableByInventoryId = new Map<string, number>()

  for (const candidate of eligibleCandidates) {
    const existing = candidatesByProductId.get(candidate.productId) ?? []
    existing.push(candidate)
    candidatesByProductId.set(candidate.productId, existing)
    availableByInventoryId.set(candidate.id, Math.max(0, toAllocationNumber(candidate.availableQuantity)))
  }

  for (const item of input.items) {
    const candidates = candidatesByProductId.get(item.productId) ?? []
    let remainingQuantity = Math.max(
      0,
      toAllocationNumber(item.requiredQuantity) - toAllocationNumber(item.allocatedQuantity ?? 0),
    )

    if (remainingQuantity <= 0) {
      continue
    }

    for (const candidate of candidates) {
      const availableQuantity = availableByInventoryId.get(candidate.id) ?? 0
      if (availableQuantity <= 0 || remainingQuantity <= 0) {
        continue
      }

      const allocationQuantity = Math.min(remainingQuantity, availableQuantity)
      rows.push({
        workOrderItemId: item.id,
        inventoryId: candidate.id,
        quantity: allocationQuantity,
      })
      availableByInventoryId.set(candidate.id, availableQuantity - allocationQuantity)
      remainingQuantity -= allocationQuantity
    }

    if (remainingQuantity > 0) {
      shortages.push({
        workOrderItemId: item.id,
        remainingQuantity,
      })
    }
  }

  return {
    rows,
    shortages,
  }
}
