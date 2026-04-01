import { buildRecordSummary } from "../../shared/record-summary.js"
import { calculateRecordSalesRepExpense, type SalesRepPercentInput } from "../../shared/record-expense-summary.js"
import { formatCurrencyValue, sumLineTotals, type LineTotalInput } from "../../shared/line-totals.js"
import { toAllocationNumber } from "./allocations/shared.js"

export * from "./allocations/index.js"

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
    (total, item) => total + toAllocationNumber(item.materialExpense),
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
  return formatCurrencyValue(toAllocationNumber(value))
}
