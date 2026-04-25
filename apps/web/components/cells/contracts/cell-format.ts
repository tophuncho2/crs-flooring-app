// Pure formatting + parsing functions for cell values. No JSX.
//
// All currency / per-unit / percent helpers accept either a string (raw
// decimal text from the wire) or a number. They return a display string;
// they never throw. `parseDecimal` returns `null` when the input is
// non-numeric so callers can decide what to do (commit empty, surface error).

export type CurrencyOptions = {
  prefix?: string
  decimals?: number
}

export function formatCurrency(value: string | number, options?: CurrencyOptions): string {
  const prefix = options?.prefix ?? "$"
  const decimals = options?.decimals ?? 2
  const numeric = typeof value === "number" ? value : parseDecimal(value)
  if (numeric === null) return ""
  return `${prefix}${numeric.toFixed(decimals)}`
}

export function formatPerUnit(
  value: string | number,
  unit: string,
  options?: { currencyPrefix?: string; decimals?: number },
): string {
  const formatted = formatCurrency(value, {
    prefix: options?.currencyPrefix ?? "$",
    decimals: options?.decimals ?? 2,
  })
  if (!formatted) return ""
  return unit ? `${formatted} / ${unit}` : formatted
}

export function formatQuantity(value: string | number, unit: string): string {
  const stringValue = typeof value === "number" ? String(value) : value
  if (!stringValue) return ""
  return unit ? `${stringValue} ${unit}` : stringValue
}

export function formatPercent(value: string | number, options?: { decimals?: number }): string {
  const decimals = options?.decimals ?? 0
  const numeric = typeof value === "number" ? value : parseDecimal(value)
  if (numeric === null) return ""
  return `${numeric.toFixed(decimals)}%`
}

export function parseDecimal(input: string): number | null {
  if (typeof input !== "string") return null
  const trimmed = input.trim()
  if (trimmed === "") return null
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : null
}
