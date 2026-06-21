import { formatEasternDateTime } from "../../shared/date-format.js"
import { formatMoney } from "../../shared/money.js"
import type { FlooringInventoryAdjustmentType } from "./adjustments/types.js"

export function parseInventoryDecimal(value: string): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function toInventoryFixedString(value: number): string {
  return value.toFixed(2)
}

export function formatInventoryImportNumber(value: string): string {
  return value ? `IMP-${value}` : "-"
}

export function formatInventoryQuantity(value: string, unitLabel: string): string {
  return `${value} ${unitLabel}`.trim()
}

/** Display sign for an adjustment's quantity: `+` for INCREASE, `−` (U+2212) for DEDUCTION. */
export function adjustmentSign(adjustmentType: FlooringInventoryAdjustmentType): "+" | "−" {
  return adjustmentType === "INCREASE" ? "+" : "−"
}

/** Quantity with its direction sign prefixed, e.g. `+100 sq ft` / `−75 sq ft`. */
export function formatSignedAdjustmentQuantity(
  quantity: string,
  adjustmentType: FlooringInventoryAdjustmentType,
  unitLabel: string,
): string {
  return `${adjustmentSign(adjustmentType)}${formatInventoryQuantity(quantity, unitLabel)}`
}

/**
 * A money figure (cost/freight) with its adjustment direction sign prefixed,
 * e.g. `+$12.34` / `−$12.34`. Returns `"—"` when the amount is absent so the
 * list cell renders a plain placeholder instead of a signed/tinted chip.
 */
export function formatSignedAdjustmentMoney(
  amount: string | null,
  adjustmentType: FlooringInventoryAdjustmentType,
): string {
  if (amount == null || amount === "") return "—"
  const money = formatMoney(amount)
  if (money === "") return "—"
  return `${adjustmentSign(adjustmentType)}${money}`
}

/**
 * Before → After balance transition, units on both sides, e.g. `100 sq ft → 75 sq ft`
 * (arrow U+2192). Returns `null` when either side is absent (pending/unfinalized rows)
 * so callers can render their own placeholder.
 */
export function formatAdjustmentTransition(
  before: string | null,
  after: string | null,
  unitLabel: string,
): string | null {
  if (before == null || before === "" || after == null || after === "") return null
  return `${formatInventoryQuantity(before, unitLabel)} → ${formatInventoryQuantity(after, unitLabel)}`
}

export type ComposeInventoryItemInput = {
  inventoryNumber: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  note: string
}

const INVENTORY_ITEM_SEPARATOR = " · "

export function composeRollNumberDisplay(prefix: string, number: string): string {
  const trimmed = number.trim()
  if (trimmed.length === 0) return ""
  return `${prefix}${trimmed}`
}

export function composeInventoryItem(input: ComposeInventoryItemInput): string {
  const rollDisplay = composeRollNumberDisplay(input.rollPrefix, input.rollNumber)
  const parts = [
    input.inventoryNumber,
    rollDisplay,
    input.dyeLot,
    input.note,
  ]
  return parts.filter((part) => part.length > 0).join(INVENTORY_ITEM_SEPARATOR)
}

export function formatFifoReceivedAtEastern(value: Date | string): string {
  return formatEasternDateTime(value)
}
