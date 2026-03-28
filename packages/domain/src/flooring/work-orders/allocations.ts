import { buildRecordSummary } from "../shared/record-summary.js"
import { calculateRecordSalesRepExpense, type SalesRepPercentInput } from "../shared/record-expense-summary.js"
import { formatCurrencyValue, sumLineTotals, type LineTotalInput } from "../shared/line-totals.js"

export type WorkOrderItemAllocationInput = {
  quantity: string | number
  unitCost: string | number
}

export type WorkOrderItemAllocationSummary = {
  allocatedQuantity: number
  remainingQuantity: number
  materialExpense: number
  hasAllocationShortage: boolean
  allocationStatus: WorkOrderMaterialAllocationStatus
  isDone: boolean
}

export type WorkOrderMaterialAllocationStatus =
  | "NOT_STARTED"
  | "PARTIALLY_ALLOCATED"
  | "FULLY_ALLOCATED"
  | "SHORTAGE"

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

export type WorkOrderAllocationWorkflowSummary = {
  isDone: boolean
  hasPendingRun: boolean
}

export type WorkOrderFinancialSummary = {
  customerCost: number
  materialExpense: number
  serviceExpense: number
  salesRepExpense: number
  companyExpenses: number
  profit: number
  profitMargin: number
}

export type WorkOrderFinancialCalculationRowKey =
  | "customerCost"
  | "companyExpenses"
  | "salesRepCost"
  | "materialExpense"
  | "serviceExpense"
  | "profit"
  | "profitMargin"

export type WorkOrderFinancialCalculationRow = {
  key: WorkOrderFinancialCalculationRowKey
  label: string
  value: number
  format: "currency" | "percentage"
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toDateValue(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    return value
  }

  const parsed = new Date(value ?? "")
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0)
  }

  return parsed
}

export function resolveInventoryFifoReceivedAt(input: {
  importCreatedAt?: string | Date | null
  inventoryCreatedAt: string | Date
}) {
  return toDateValue(input.importCreatedAt ?? input.inventoryCreatedAt)
}

export function compareWorkOrderAllocationCandidatesByFifo(
  left: Pick<WorkOrderAllocationCandidate, "fifoReceivedAt" | "itemNumber" | "id">,
  right: Pick<WorkOrderAllocationCandidate, "fifoReceivedAt" | "itemNumber" | "id">,
) {
  const leftFifo = toDateValue(left.fifoReceivedAt).getTime()
  const rightFifo = toDateValue(right.fifoReceivedAt).getTime()

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

export function determineWorkOrderMaterialAllocationStatus(input: {
  requiredQuantity: string | number
  allocatedQuantity: string | number
  hasPendingAllocationRun?: boolean
  hasEligibleInventoryRemaining?: boolean
}): WorkOrderMaterialAllocationStatus {
  const requiredQuantity = toNumber(input.requiredQuantity)
  const allocatedQuantity = toNumber(input.allocatedQuantity)
  const remainingQuantity = Math.max(0, requiredQuantity - allocatedQuantity)

  if (remainingQuantity <= 0.0001) {
    return "FULLY_ALLOCATED"
  }

  if (input.hasPendingAllocationRun) {
    return allocatedQuantity > 0 ? "PARTIALLY_ALLOCATED" : "NOT_STARTED"
  }

  if (input.hasEligibleInventoryRemaining === false) {
    return "SHORTAGE"
  }

  return allocatedQuantity > 0 ? "PARTIALLY_ALLOCATED" : "NOT_STARTED"
}

export function calculateInventoryPricePerUnit(input: {
  stockCount: string | number | null | undefined
  cost: string | number | null | undefined
  freight: string | number | null | undefined
}) {
  const stockCount = toNumber(input.stockCount)
  if (stockCount <= 0) {
    return 0
  }

  return (toNumber(input.cost) + toNumber(input.freight)) / stockCount
}

export function calculateAllocationRowTotal(input: WorkOrderItemAllocationInput) {
  return toNumber(input.quantity) * toNumber(input.unitCost)
}

export function buildWorkOrderItemAllocationSummary(input: {
  requiredQuantity: string | number
  allocations: WorkOrderItemAllocationInput[]
  hasPendingAllocationRun?: boolean
  hasEligibleInventoryRemaining?: boolean
}): WorkOrderItemAllocationSummary {
  const allocatedQuantity = input.allocations.reduce((total, allocation) => total + toNumber(allocation.quantity), 0)
  const requiredQuantity = toNumber(input.requiredQuantity)
  const remainingQuantity = Math.max(0, requiredQuantity - allocatedQuantity)
  const materialExpense = input.allocations.reduce((total, allocation) => total + calculateAllocationRowTotal(allocation), 0)
  const allocationStatus = determineWorkOrderMaterialAllocationStatus({
    requiredQuantity,
    allocatedQuantity,
    hasPendingAllocationRun: input.hasPendingAllocationRun,
    hasEligibleInventoryRemaining: input.hasEligibleInventoryRemaining,
  })
  const isDone = !input.hasPendingAllocationRun && (allocationStatus === "FULLY_ALLOCATED" || allocationStatus === "SHORTAGE")

  return {
    allocatedQuantity,
    remainingQuantity,
    materialExpense,
    hasAllocationShortage: allocationStatus === "SHORTAGE",
    allocationStatus,
    isDone,
  }
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
    availableByInventoryId.set(candidate.id, Math.max(0, toNumber(candidate.availableQuantity)))
  }

  for (const item of input.items) {
    const candidates = candidatesByProductId.get(item.productId) ?? []
    let remainingQuantity = Math.max(
      0,
      toNumber(item.requiredQuantity) - toNumber(item.allocatedQuantity ?? 0),
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

export function buildWorkOrderAllocationWorkflowSummary(input: {
  itemStatuses: WorkOrderMaterialAllocationStatus[]
  hasPendingRun: boolean
}): WorkOrderAllocationWorkflowSummary {
  return {
    hasPendingRun: input.hasPendingRun,
    isDone:
      !input.hasPendingRun &&
      input.itemStatuses.every((status) => status === "FULLY_ALLOCATED" || status === "SHORTAGE"),
  }
}

export function buildWorkOrderFinancialSummary(input: {
  materialItems: Array<LineTotalInput & { materialExpense?: string | number | null }>
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}): WorkOrderFinancialSummary {
  const customerSummary = buildRecordSummary({
    materialItems: input.materialItems,
    serviceItems: input.serviceItems,
  })
  const materialExpense = input.materialItems.reduce(
    (total, item) => total + toNumber(item.materialExpense),
    0,
  )
  const serviceExpense = sumLineTotals(input.serviceItems)
  const customerCost = customerSummary.grandTotal
  const salesRepExpense = calculateRecordSalesRepExpense(customerCost, input.salesReps)
  const companyExpenses = materialExpense + serviceExpense + salesRepExpense
  const profit = customerCost - companyExpenses
  const profitMargin = customerCost === 0 ? 0 : profit / customerCost

  return {
    customerCost,
    materialExpense,
    serviceExpense,
    salesRepExpense,
    companyExpenses,
    profit,
    profitMargin,
  }
}

export function buildWorkOrderFinancialCalculationRows(
  summary: WorkOrderFinancialSummary,
): WorkOrderFinancialCalculationRow[] {
  return [
    { key: "customerCost", label: "Customer Cost", value: summary.customerCost, format: "currency" },
    { key: "companyExpenses", label: "Company Expenses", value: summary.companyExpenses, format: "currency" },
    { key: "salesRepCost", label: "Sales Rep Cost", value: summary.salesRepExpense, format: "currency" },
    { key: "materialExpense", label: "Material Expense", value: summary.materialExpense, format: "currency" },
    { key: "serviceExpense", label: "Service Expense", value: summary.serviceExpense, format: "currency" },
    { key: "profit", label: "Profit", value: summary.profit, format: "currency" },
    { key: "profitMargin", label: "Profit Margin", value: summary.profitMargin, format: "percentage" },
  ]
}

export function formatInventoryPricePerUnit(value: string | number | null | undefined) {
  return formatCurrencyValue(toNumber(value))
}
