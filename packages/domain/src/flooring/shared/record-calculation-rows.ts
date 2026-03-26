import { calculateRecordExpenseSummary, type RecordExpenseSummary, type SalesRepPercentInput } from "./record-expense-summary.js"
import type { LineTotalInput } from "./line-totals.js"

export type CalculationRowKey =
  | "customerCost"
  | "expenses"
  | "salesRepCost"
  | "materialCost"
  | "serviceCost"
  | "profit"
  | "profitMargin"

export type CalculationRowFormat = "currency" | "percentage"

export type CalculationRow = {
  key: CalculationRowKey
  label: string
  value: number
  format: CalculationRowFormat
}

export function buildRecordCalculationRowsFromSummary(summary: RecordExpenseSummary): CalculationRow[] {
  return [
    { key: "customerCost", label: "Customer Cost", value: summary.customerCost, format: "currency" },
    { key: "expenses", label: "Expenses", value: summary.expenses, format: "currency" },
    { key: "salesRepCost", label: "Sales Rep Cost", value: summary.salesRepExpense, format: "currency" },
    { key: "materialCost", label: "Material Cost", value: summary.materialTotal, format: "currency" },
    { key: "serviceCost", label: "Service Cost", value: summary.serviceTotal, format: "currency" },
    { key: "profit", label: "Profit", value: summary.profit, format: "currency" },
    { key: "profitMargin", label: "Profit Margin", value: summary.profitMargin, format: "percentage" },
  ]
}

export function buildRecordCalculationRows(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}) {
  return buildRecordCalculationRowsFromSummary(calculateRecordExpenseSummary(input))
}
