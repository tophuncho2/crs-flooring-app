export function parseInventoryDecimal(value: string): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function toInventoryFixedString(value: number): string {
  return value.toFixed(2)
}

export function formatInventoryImportNumber(value: string): string {
  return value ? `IMP-${value.padStart(4, "0")}` : "-"
}

export function formatInventoryQuantity(value: string, unitLabel: string): string {
  return `${value} ${unitLabel}`.trim()
}

export type FullLocationCodeInput = {
  warehouseNumber: number
  sectionNumber: number
  rafter: number
  level: number
}

/**
 * Replaces the stale `locationCode` column (dropped in the warehouse sweep) with a
 * derivation from warehouse + section + rafter + level. Source of truth for the
 * `"W{n}-S{n}-R{n}-L{n}"` format used across list + record views.
 */
export function formatFullLocationCode(input: FullLocationCodeInput): string {
  return `W${input.warehouseNumber}-S${input.sectionNumber}-R${input.rafter}-L${input.level}`
}
