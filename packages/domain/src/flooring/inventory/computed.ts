import { categoryRequiresCoveragePerUnit } from "../categories/rules.js"
import { parseInventoryDecimal } from "./formatters.js"

/**
 * Balance = startingStock − totalCutSum. Always defined; returns 0 if either
 * input is a malformed number string (per `parseInventoryDecimal` semantics).
 * Negative results are clamped to 0 defensively — an inventory row should
 * never go below zero once cut logs are applied, so a negative value would
 * indicate upstream math drift and isn't worth surfacing as "negative balance."
 */
export function computeInventoryBalance(input: {
  startingStock: string
  totalCutSum: string
}): number {
  const starting = parseInventoryDecimal(input.startingStock)
  const cut = parseInventoryDecimal(input.totalCutSum)
  const balance = starting - cut
  return balance < 0 ? 0 : balance
}

/**
 * Coverage = balance × coveragePerUnit, **only** when the row's category is
 * in the coverage-per-unit set. Returns `null` for non-coverage categories —
 * same null semantics used on the product + inventory columns: "no coverage
 * concept for this category." Null also propagates when `coveragePerUnit`
 * is missing (nullable on the column; worker only populates it for special
 * categories).
 */
export function computeInventoryCoverage(input: {
  balance: number
  coveragePerUnit: string | null
  categorySlug: string | null
}): number | null {
  if (!categoryRequiresCoveragePerUnit(input.categorySlug)) return null
  if (input.coveragePerUnit === null) return null
  const perUnit = parseInventoryDecimal(input.coveragePerUnit)
  if (!Number.isFinite(perUnit) || perUnit <= 0) return null
  return input.balance * perUnit
}

/**
 * Human-readable copy for the `INVENTORY_OVERSOLD` rejection — used by the
 * cut-log save use case (sweep 2) when a requested cut would push the balance
 * below zero. Co-located with the balance math so the message format and the
 * formula stay in lock-step.
 */
export function buildInventoryOversoldMessage(input: {
  requestedCut: string
  availableBalance: string
  stockUnitAbbrev: string | null
}): string {
  const unit = input.stockUnitAbbrev && input.stockUnitAbbrev.length > 0 ? ` ${input.stockUnitAbbrev}` : ""
  return `Cannot cut ${input.requestedCut}${unit}: only ${input.availableBalance}${unit} available.`
}

/**
 * Per-unit cost for an inventory row materialized from a staged row. Returns
 * null when total cost is null or starting stock is non-positive (no division
 * by zero, no false-zero artifacts). Per-unit values are derived once at
 * materialize time and immutable thereafter.
 */
export function computeCostPerUnit(input: {
  cost: string | null
  startingStock: string
}): string | null {
  if (input.cost === null) return null
  const cost = Number(input.cost)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(cost) || !Number.isFinite(stock) || stock <= 0) {
    return null
  }
  return (cost / stock).toFixed(2)
}

/**
 * Per-unit freight for an inventory row materialized from a staged row. Same
 * contract as `computeCostPerUnit`.
 */
export function computeFreightPerUnit(input: {
  freight: string | null
  startingStock: string
}): string | null {
  if (input.freight === null) return null
  const freight = Number(input.freight)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(freight) || !Number.isFinite(stock) || stock <= 0) {
    return null
  }
  return (freight / stock).toFixed(2)
}
