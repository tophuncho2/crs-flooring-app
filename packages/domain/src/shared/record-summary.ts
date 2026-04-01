import { sumLineTotals, type LineTotalInput } from "./line-totals.js"

export type RecordSummary = {
  materialItemsCount: number
  serviceItemsCount: number
  totalItemsCount: number
  materialTotal: number
  serviceTotal: number
  grandTotal: number
}

export function buildRecordSummary(input: {
  materialItems: LineTotalInput[]
  serviceItems: LineTotalInput[]
}): RecordSummary {
  const materialItemsCount = input.materialItems.length
  const serviceItemsCount = input.serviceItems.length
  const materialTotal = sumLineTotals(input.materialItems)
  const serviceTotal = sumLineTotals(input.serviceItems)

  return {
    materialItemsCount,
    serviceItemsCount,
    totalItemsCount: materialItemsCount + serviceItemsCount,
    materialTotal,
    serviceTotal,
    grandTotal: materialTotal + serviceTotal,
  }
}

export function emptyRecordSummary(): RecordSummary {
  return {
    materialItemsCount: 0,
    serviceItemsCount: 0,
    totalItemsCount: 0,
    materialTotal: 0,
    serviceTotal: 0,
    grandTotal: 0,
  }
}
