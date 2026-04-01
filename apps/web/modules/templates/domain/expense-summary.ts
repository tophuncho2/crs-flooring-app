import {
  calculateRecordExpenseSummary,
  calculateRecordSalesRepExpense,
  normalizeRecordExpenseSummary,
  type RecordExpenseSummary,
  type SalesRepPercentInput,
} from "@/modules/shared/domain/record-expense-summary"
import type { LineTotalInput } from "@/modules/shared/domain/line-totals"

export type TemplateExpenseSummary = RecordExpenseSummary

export function calculateTemplateSalesRepExpense(customerCost: number, salesReps: SalesRepPercentInput[]) {
  return calculateRecordSalesRepExpense(customerCost, salesReps)
}

export function calculateTemplateExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}): TemplateExpenseSummary {
  return calculateRecordExpenseSummary(input)
}

export function normalizeTemplateExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}) {
  return normalizeRecordExpenseSummary(input)
}
