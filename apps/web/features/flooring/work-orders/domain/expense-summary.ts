import {
  calculateRecordExpenseSummary,
  calculateRecordSalesRepExpense,
  normalizeRecordExpenseSummary,
  type RecordExpenseSummary,
  type SalesRepPercentInput,
} from "@/features/flooring/shared/domain/record-expense-summary"
import type { LineTotalInput } from "@/features/flooring/shared/domain/line-totals"

export type WorkOrderExpenseSummary = RecordExpenseSummary

export function calculateWorkOrderSalesRepExpense(customerCost: number, salesReps: SalesRepPercentInput[]) {
  return calculateRecordSalesRepExpense(customerCost, salesReps)
}

export function calculateWorkOrderExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}): WorkOrderExpenseSummary {
  return calculateRecordExpenseSummary(input)
}

export function normalizeWorkOrderExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}) {
  return normalizeRecordExpenseSummary(input)
}
