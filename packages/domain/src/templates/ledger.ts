// The authoritative derived cost/profit/margin ledger for a template. ONE pure
// function computes every roll-up the record view shows, so Net / Projected are
// never re-derived inline in two places. Composes the existing line-total math
// (planned-products, service-items, tax, commissions) and adds the Net → Projected
// stack. Integer-cents BigInt throughout so every figure agrees to the penny.
//
// The money model (settled):
//   Net Cost        = Σ all planned + service line totals (direct from the rows)
//   Net Margin (%)  = (Total Transaction − Net Cost) / Total Transaction × 100
//   Net Profit ($)  = Total Transaction − Net Cost
//   Commission ($)  = Σ (row.percent × Net Cost)          — its own roll-up
//   Tax ($)         = taxRate × the taxed line totals      — unchanged
//   Projected Cost  = Net Cost + Tax + Commission
//   Projected Profit= Total Transaction − Projected Cost
//   Projected Margin= Projected Profit / Total Transaction × 100
// Commission stays OUT of Net Cost/Margin/Profit; it rides into Projected only.
// Margins render "" (the UI shows "—") when Total Transaction is blank / zero.

import { normalizeMoneyAmount } from "../shared/money.js"
import { sumTemplatePlannedProductLineTotals } from "./planned-products/math.js"
import { sumTemplateServiceItemLineTotalsByType } from "./service-items/rollup.js"
import { sumTemplateCommissionLineTotals } from "./commissions/math.js"
import { computeTemplateTaxCost } from "./tax.js"

export type TemplateLedgerPlannedInput = {
  quantity: string
  // Per-unit basis (for a planned product this is the live product cost).
  cost: string
  taxed: boolean
}

export type TemplateLedgerServiceInput = {
  itemType: string
  quantity: string
  cost: string
  taxed: boolean
}

export type TemplateLedgerCommissionInput = {
  percent: string
}

export type TemplateLedgerInputs = {
  totalTransaction: string
  taxRate: string
  plannedProducts: TemplateLedgerPlannedInput[]
  serviceItems: TemplateLedgerServiceInput[]
  commissions: TemplateLedgerCommissionInput[]
}

export type TemplateCostLedger = {
  // Dollar roll-ups (canonical "X.XX").
  materialCost: string
  laborCost: string
  miscCost: string
  netCost: string
  netProfit: string
  commissionCost: string
  taxCost: string
  projectedCost: string
  projectedProfit: string
  // Percent figures: canonical "X.XX" (may be negative), or "" when Total
  // Transaction is blank / zero (the UI renders "—").
  netMargin: string
  projectedMargin: string
}

function moneyToCents(value: string): bigint {
  const normalized = normalizeMoneyAmount(value)
  if (normalized === "") return 0n
  return BigInt(normalized.replace(".", ""))
}

// Signed cents → "X.XX" (preserves a leading "-" for a loss).
function centsToMoney(cents: bigint): string {
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  const dollars = abs / 100n
  const remainder = (abs % 100n).toString().padStart(2, "0")
  return `${negative ? "-" : ""}${dollars.toString()}.${remainder}`
}

// Round-half-up division for a non-negative denominator, sign carried by the
// numerator. Used for the margin percentage (revenue is always ≥ 0).
function roundHalfUpDiv(num: bigint, den: bigint): bigint {
  if (num >= 0n) return (2n * num + den) / (2n * den)
  const positive = -num
  return -((2n * positive + den) / (2n * den))
}

// Margin % = profit / revenue × 100, to two decimals, as a canonical "X.XX" string.
// "" when there is no revenue to measure against (blank / zero Total Transaction).
function computeMarginPercent(profitCents: bigint, revenueCents: bigint): string {
  if (revenueCents === 0n) return ""
  // percent×100 (two decimals) = profitCents × 10000 / revenueCents.
  const scaled = roundHalfUpDiv(profitCents * 10000n, revenueCents)
  const negative = scaled < 0n
  const abs = negative ? -scaled : scaled
  const whole = abs / 100n
  const frac = (abs % 100n).toString().padStart(2, "0")
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`
}

export function computeTemplateCostLedger(inputs: TemplateLedgerInputs): TemplateCostLedger {
  const plannedLines = inputs.plannedProducts.map((row) => ({
    quantity: row.quantity,
    cost: row.cost,
  }))
  const serviceLines = inputs.serviceItems.map((row) => ({
    quantity: row.quantity,
    cost: row.cost,
  }))

  const materialCost = sumTemplatePlannedProductLineTotals(plannedLines)
  const serviceByType = sumTemplateServiceItemLineTotalsByType(
    inputs.serviceItems.map((row) => ({
      itemType: row.itemType,
      quantity: row.quantity,
      cost: row.cost,
    })),
  )
  // Net Cost = every planned + service line total, computed directly from the rows
  // (not re-summed from the Material/Labor/Misc roll-ups).
  const netCost = sumTemplatePlannedProductLineTotals([...plannedLines, ...serviceLines])

  // Tax = taxRate × the taxed line totals across both tables (unchanged).
  const taxedLines = [
    ...inputs.plannedProducts.filter((row) => row.taxed).map((row) => ({ quantity: row.quantity, cost: row.cost })),
    ...inputs.serviceItems.filter((row) => row.taxed).map((row) => ({ quantity: row.quantity, cost: row.cost })),
  ]
  const taxCost = computeTemplateTaxCost(taxedLines, inputs.taxRate)

  // Commission = Σ (row.percent × Net Cost). Its own roll-up; not in Net Cost.
  const commissionCost = sumTemplateCommissionLineTotals(
    inputs.commissions.map((row) => row.percent),
    netCost,
  )

  const revenueCents = moneyToCents(inputs.totalTransaction)
  const netCostCents = moneyToCents(netCost)
  const taxCents = moneyToCents(taxCost)
  const commissionCents = moneyToCents(commissionCost)

  const projectedCostCents = netCostCents + taxCents + commissionCents
  const netProfitCents = revenueCents - netCostCents
  const projectedProfitCents = revenueCents - projectedCostCents

  const hasRevenue = inputs.totalTransaction.trim() !== "" && revenueCents !== 0n

  return {
    materialCost,
    laborCost: serviceByType.LABOR,
    miscCost: serviceByType.MISCELLANEOUS,
    netCost,
    netProfit: centsToMoney(netProfitCents),
    commissionCost,
    taxCost,
    projectedCost: centsToMoney(projectedCostCents),
    projectedProfit: centsToMoney(projectedProfitCents),
    netMargin: hasRevenue ? computeMarginPercent(netProfitCents, revenueCents) : "",
    projectedMargin: hasRevenue ? computeMarginPercent(projectedProfitCents, revenueCents) : "",
  }
}
