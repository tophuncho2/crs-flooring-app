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
  rollNumber: string
  location: string
  dyeLot: string
  note: string
}

const INVENTORY_ITEM_SEPARATOR = " · "

/**
 * Canonical composer for the `inventoryItem` denorm column on
 * `FlooringInventory`. Joins non-empty parts in order:
 * `inventoryNumber · rollNumber · location · dyeLot · note`.
 *
 * `inventoryNumber` is always present (DB sequence assigns at create), so
 * the output is never empty. Empty parts are skipped — no placeholders.
 *
 * Single source of truth: the inventory update use case calls this inside
 * the same transaction as any patch that touches a source field, so the
 * column never drifts. The materialize use case calls it on create. The
 * cut-log creator does NOT call this — it copies inventory.inventoryItem
 * verbatim as an immutable snapshot at cut time.
 */
export function composeInventoryItem(input: ComposeInventoryItemInput): string {
  const parts = [
    input.inventoryNumber,
    input.rollNumber,
    input.location,
    input.dyeLot,
    input.note,
  ]
  return parts.filter((part) => part.length > 0).join(INVENTORY_ITEM_SEPARATOR)
}

/**
 * Server-side `rollNumber` normalizer. Trims the input; empty becomes `null`.
 * Non-empty values get a strict `"ROLL"` prefix prepended (no separator, no
 * inspection of existing content — `"ROLL1234"` in produces `"ROLLROLL1234"`
 * out). The validator/UI layer is responsible for keeping the prefix out of
 * user-typed input. Single source of truth for both the inventory update use
 * case and the materialize use case (worker stabilization sweep).
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
