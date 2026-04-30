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

function toStableDate(value: string | Date) {
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
