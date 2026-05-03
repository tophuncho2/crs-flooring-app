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

export function formatLocationRafterLevel(input: { rafter: number; level: number }): string {
  return `R${input.rafter}-L${input.level}`
}

export type SectionCodeInput = {
  warehouseNumber: number
  sectionNumber: number
}

/**
 * Section-only prefix of `formatFullLocationCode`. Used by UIs that filter
 * inventory by section rather than full location.
 */
export function formatSectionCode(input: SectionCodeInput): string {
  return `W${input.warehouseNumber}-S${input.sectionNumber}`
}

/**
 * Builds the canonical inventory-row label used in cut-log inventory dropdowns
 * and similar pickers.
 *
 * Format: `{stockBalance} {stockUnitAbbrev} - {itemNumber|—} - {locationCode|—} - {dyeLot|—} - {inventoryNumber}`
 *
 * Empty `stockUnitAbbrev` collapses to no trailing space; nullable string
 * fields fall back to an em-dash placeholder. Pure string formatting; no
 * caller wires this in yet — sweep 2 will adopt it for the cut-log section.
 */
export function buildInventoryDropdownLabel(input: {
  stockBalance: string
  stockUnitAbbrev: string | null
  itemNumber: string | null
  locationCode: string | null
  dyeLot: string | null
  inventoryNumber: string
}): string {
  const PLACEHOLDER = "—"
  const unit = input.stockUnitAbbrev ?? ""
  const balanceWithUnit = unit.length > 0 ? `${input.stockBalance} ${unit}` : input.stockBalance
  const itemNumber = input.itemNumber && input.itemNumber.length > 0 ? input.itemNumber : PLACEHOLDER
  const locationCode = input.locationCode && input.locationCode.length > 0 ? input.locationCode : PLACEHOLDER
  const dyeLot = input.dyeLot && input.dyeLot.length > 0 ? input.dyeLot : PLACEHOLDER
  return `${balanceWithUnit} - ${itemNumber} - ${locationCode} - ${dyeLot} - ${input.inventoryNumber}`
}
