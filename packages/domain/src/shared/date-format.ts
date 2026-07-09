const stableDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
})

const stableDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

/**
 * The shared date parser behind every formatter here — the single source of
 * truth for turning a stored value into a UTC-stable `Date`. A bare
 * `YYYY-MM-DD` (a `@db.Date` value) is pinned to UTC midnight so it never drifts
 * a day across timezones; anything else defers to the native `Date` parser
 * (callers guard `Number.isNaN(getTime())` for unparseable input).
 */
export function toStableDate(value: string | Date) {
  if (value instanceof Date) {
    return value
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`)
  }

  return new Date(value)
}

export function formatStableDate(value: string | Date) {
  return stableDateFormatter.format(toStableDate(value))
}

export function formatStableDateTime(value: string | Date) {
  return stableDateTimeFormatter.format(toStableDate(value))
}

// Eastern wall-clock display for operational timestamps (received-at, cut times,
// record created/updated). Pinned to America/New_York so every viewer sees the
// same warehouse-local time and SSR == CSR. timeZoneName "short" => EDT / EST.
const easternDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
})

/**
 * Formats an operational timestamp as Eastern wall-clock for display, e.g.
 * `May 27, 2026, 3:45 PM EDT`. Single source of truth for time columns so they
 * read identically for every viewer regardless of browser timezone. Returns ""
 * for null / undefined / empty / unparseable input; callers add their own empty
 * placeholder (e.g. "—") if desired.
 */
export function formatEasternDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""
  const date = toStableDate(value)
  if (Number.isNaN(date.getTime())) return ""
  return easternDateTimeFormatter.format(date)
}

/**
 * Projects an ISO timestamp / Date / null into the `YYYY-MM-DD` shape an
 * `<input type="date">` element accepts. Returns `""` for null, undefined,
 * empty, or invalid input. UTC-stable so the displayed date matches what
 * was stored on the server.
 */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""
  const date = toStableDate(value)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
