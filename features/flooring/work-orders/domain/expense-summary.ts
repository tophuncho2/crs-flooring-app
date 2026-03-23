import { sumLineTotals, type LineTotalInput } from "@/features/flooring/shared/domain/line-totals"

type SalesRepPercentInput = {
  percent: string | number
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export type WorkOrderExpenseSummary = {
  materialTotal: number
  serviceTotal: number
  customerCost: number
  salesRepExpense: number
  expenses: number
}

export function calculateWorkOrderSalesRepExpense(customerCost: number, salesReps: SalesRepPercentInput[]) {
  return salesReps.reduce((total, salesRep) => total + customerCost * (toNumber(salesRep.percent) / 100), 0)
}

export function calculateWorkOrderExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}): WorkOrderExpenseSummary {
  const materialTotal = sumLineTotals(input.items)
  const serviceTotal = sumLineTotals(input.serviceItems)
  const customerCost = materialTotal + serviceTotal
  const salesRepExpense = calculateWorkOrderSalesRepExpense(customerCost, input.salesReps)

  return {
    materialTotal,
    serviceTotal,
    customerCost,
    salesRepExpense,
    expenses: serviceTotal + salesRepExpense,
  }
}

export function normalizeWorkOrderExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}) {
  return calculateWorkOrderExpenseSummary(input)
}
