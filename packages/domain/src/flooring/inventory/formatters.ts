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

export type ComposeInventoryItemInput = {
  inventoryNumber: string
  rollPrefix?: string
  rollNumber: string
  location: string
  dyeLot: string
  note: string
}

const INVENTORY_ITEM_SEPARATOR = " · "
const DEFAULT_ROLL_PREFIX = "ROLL#"

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
 * `inventoryNumber · {prefix+rollNumber} · location · dyeLot · note`.
 *
 * `inventoryNumber` is always present (DB sequence assigns at create), so
 * the output is never empty. Empty parts are skipped — no placeholders.
 * `rollPrefix` defaults to `"ROLL#"` (matching the column default) when the
 * caller omits it — temporary backward-compat during the rollPrefix sweep;
 * data-layer callers always pass the row's stored prefix.
 *
 * Single source of truth: the inventory update use case calls this inside
 * the same transaction as any patch that touches a source field, so the
 * column never drifts. The materialize use case calls it on create. The
 * cut-log creator does NOT call this — it copies inventory.inventoryItem
 * verbatim as an immutable snapshot at cut time.
 */
export function composeInventoryItem(input: ComposeInventoryItemInput): string {
  const rollDisplay = composeRollNumberDisplay(
    input.rollPrefix ?? DEFAULT_ROLL_PREFIX,
    input.rollNumber,
  )
  const parts = [
    input.inventoryNumber,
    rollDisplay,
    input.location,
    input.dyeLot,
    input.note,
  ]
  return parts.filter((part) => part.length > 0).join(INVENTORY_ITEM_SEPARATOR)
}

/**
 * @deprecated Scheduled for removal in the application-layer commit of the
 * rollPrefix sweep. `rollPrefix` now lives in its own column; user input is
 * the bare suffix. Application use cases will stop calling this and rely on
 * the API validator to strip any leading `ROLL#?`/`ROLL-?` defensively.
 *
 * Server-side `rollNumber` normalizer. Trims the input; empty becomes `null`.
 * Non-empty values get a strict `"ROLL"` prefix prepended (no separator, no
 * inspection of existing content — `"ROLL1234"` in produces `"ROLLROLL1234"`
 * out). This was the duplication site that motivated the prefix column split.
 */
export function applyRollNumberPrefix(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  return `ROLL${trimmed}`
}

const FIFO_EASTERN_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

/**
 * Formats a `fifoReceivedAt` timestamp (UTC-stored TIMESTAMPTZ) as Eastern
 * Time wall-clock for list/record displays. Format: `MM/DD/YYYY, HH:MM`.
 */
export function formatFifoReceivedAtEastern(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  return FIFO_EASTERN_FORMATTER.format(date)
}
