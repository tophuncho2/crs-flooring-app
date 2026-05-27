import { formatEasternDateTime } from "../../shared/date-format.js"

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

export type ComposeInventoryItemInput = {
  inventoryNumber: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  note: string
}

const INVENTORY_ITEM_SEPARATOR = " · "

/**
 * Composes the display form of a roll number: `${prefix}${number}` when the
 * user-typed suffix is non-empty, otherwise an empty string. Single source of
 * truth for list cells, picker labels, the `inventoryItem` denorm composer,
 * and any future surface that needs the human-readable identifier. The prefix
 * is a persisted column (`flooring_inventory.rollPrefix`, default `"ROLL#"`)
 * — never typed by the user and never part of any mutation payload.
 */
export function composeRollNumberDisplay(prefix: string, number: string): string {
  const trimmed = number.trim()
  if (trimmed.length === 0) return ""
  return `${prefix}${trimmed}`
}

/**
 * Canonical composer for the `inventoryItem` denorm column on
 * `FlooringInventory`. Joins non-empty parts in order:
 * `inventoryNumber · {rollPrefix+rollNumber} · dyeLot · note`.
 *
 * `inventoryNumber` is always present (DB sequence assigns at create), so
 * the output is never empty. Empty parts are skipped — no placeholders.
 * `rollPrefix` is required — callers pass the row's stored prefix
 * (read-repository normalizers stamp it on every `InventoryRow` /
 * `StagedInventoryRow`).
 *
 * Single source of truth: the inventory update use case calls this inside
 * the same transaction as any patch that touches a source field, so the
 * column never drifts. The materialize primitive calls it on create. The
 * cut-log creator does NOT call this — it copies inventory.inventoryItem
 * verbatim as an immutable snapshot at cut time.
 */
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

/**
 * Formats a `fifoReceivedAt` timestamp (UTC-stored TIMESTAMPTZ) as Eastern
 * Time wall-clock for list/record displays. Format: `Mon D, YYYY, h:mm AM/PM ET`
 * (e.g. `May 27, 2026, 3:45 PM EDT`). Delegates to the shared time-column
 * primitive so it stays in lockstep with other timestamp displays.
 */
export function formatFifoReceivedAtEastern(value: Date | string): string {
  return formatEasternDateTime(value)
}
