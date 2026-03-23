import { sumLineTotals, type LineTotalInput } from "./line-totals"

export type SalesRepPercentInput = {
  percent: string | number
}

export type RecordExpenseSummary = {
  materialTotal: number
  serviceTotal: number
  customerCost: number
  salesRepExpense: number
  expenses: number
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateRecordSalesRepExpense(customerCost: number, salesReps: SalesRepPercentInput[]) {
  return salesReps.reduce((total, salesRep) => total + customerCost * (toNumber(salesRep.percent) / 100), 0)
}

export function calculateRecordExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}): RecordExpenseSummary {
  const materialTotal = sumLineTotals(input.items)
  const serviceTotal = sumLineTotals(input.serviceItems)
  const customerCost = materialTotal + serviceTotal
  const salesRepExpense = calculateRecordSalesRepExpense(customerCost, input.salesReps)

  return {
    materialTotal,
    serviceTotal,
    customerCost,
    salesRepExpense,
    expenses: serviceTotal + salesRepExpense,
  }
}

export function normalizeRecordExpenseSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: SalesRepPercentInput[]
}) {
  return calculateRecordExpenseSummary(input)
}
