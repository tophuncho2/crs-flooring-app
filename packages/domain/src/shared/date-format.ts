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
