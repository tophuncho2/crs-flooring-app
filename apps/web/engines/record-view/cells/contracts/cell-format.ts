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

/**
 * Sanitize free-form numeric input so it contains only digits and at most one
 * decimal point with at most `maxDecimals` digits after it. Used by every
 * editable number-style cell to keep currency / quantity / per-unit fields
 * canonical at the input layer. Pass `maxDecimals = 0` for integer-only.
 *
 * Examples (with default `maxDecimals = 2`):
 *   "120.00fvf" → "120.00"
 *   "20.000.vd" → "20.00"
 *   "1.234"     → "1.23"
 *   "abc"       → ""
 *   "."         → "."   (allow mid-typing)
 */
export function sanitizeDecimal(input: string, maxDecimals = 2): string {
  if (maxDecimals <= 0) {
    return input.replace(/[^\d]/g, "")
  }
  const cleaned = input.replace(/[^\d.]/g, "")
  const firstDot = cleaned.indexOf(".")
  if (firstDot < 0) return cleaned
  const head = cleaned.slice(0, firstDot + 1)
  const tail = cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, maxDecimals)
  return head + tail
}
