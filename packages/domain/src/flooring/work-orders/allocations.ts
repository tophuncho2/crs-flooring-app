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
}): WorkOrderItemAllocationSummary {
  const allocatedQuantity = input.allocations.reduce((total, allocation) => total + toNumber(allocation.quantity), 0)
  const requiredQuantity = toNumber(input.requiredQuantity)
  const remainingQuantity = Math.max(0, requiredQuantity - allocatedQuantity)
  const materialExpense = input.allocations.reduce((total, allocation) => total + calculateAllocationRowTotal(allocation), 0)

  return {
    allocatedQuantity,
    remainingQuantity,
    materialExpense,
    hasAllocationShortage: remainingQuantity > 0,
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
