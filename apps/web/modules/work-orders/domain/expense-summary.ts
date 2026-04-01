import {
  buildWorkOrderFinancialCalculationRows,
  buildWorkOrderFinancialSummary,
  calculateRecordSalesRepExpense,
  sumLineTotals,
  type WorkOrderFinancialCalculationRow,
  type LineTotalInput,
  type WorkOrderFinancialSummary,
} from "@builders/domain"

export type WorkOrderExpenseSummary = WorkOrderFinancialSummary
export type WorkOrderCalculationRow = WorkOrderFinancialCalculationRow

export function normalizeWorkOrderExpenseSummary(input: {
  items: Array<LineTotalInput & { materialExpense?: string | number | null }>
  serviceItems: LineTotalInput[]
  salesReps: Array<{ percent: string | number }>
}) {
  return buildWorkOrderFinancialSummary({
    materialItems: input.items,
    serviceItems: input.serviceItems,
    salesReps: input.salesReps,
  })
}

export const normalizeWorkOrderExpenseTotals = normalizeWorkOrderExpenseSummary

export function calculateWorkOrderExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: Array<{ percent: string | number }>
}) {
  const materialTotal = sumLineTotals(input.items)
  const serviceTotal = sumLineTotals(input.serviceItems)
  const customerCost = materialTotal + serviceTotal
  const salesRepExpense = calculateRecordSalesRepExpense(customerCost, input.salesReps)
  const expenses = materialTotal + serviceTotal + salesRepExpense
  const profit = customerCost - expenses
  const profitMargin = customerCost === 0 ? 0 : profit / customerCost

  return {
    materialTotal,
    serviceTotal,
    customerCost,
    salesRepExpense,
    expenses,
    profit,
    profitMargin,
  }
}

export function calculateWorkOrderSalesRepExpense(
  customerCost: number,
  salesReps: Array<{ percent: string | number }>,
) {
  return calculateRecordSalesRepExpense(customerCost, salesReps)
}

export function buildWorkOrderCalculationRowsFromSummary(summary: WorkOrderExpenseSummary) {
  return buildWorkOrderFinancialCalculationRows(summary)
}
