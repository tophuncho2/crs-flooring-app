import { toDateInputValue } from "@builders/domain"

export type ScheduledForRange = { start: string; end: string }

/**
 * Quick-preset ranges for the work-order `scheduledFor` filter. Each range is
 * resolved against the operator's wall-clock day in America/New_York (so a user
 * working late at night gets *their* "today", not UTC's), then emitted as plain
 * `YYYY-MM-DD` bounds. The bounds flow into the same UTC-pinned `gte`/`lte`
 * comparison the manual date inputs use — Eastern only decides which calendar
 * date the preset lands on, never the comparison itself.
 *
 * Week is Sunday–Saturday.
 */

// en-CA formats a Date as ISO `YYYY-MM-DD`.
const easternDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
})

function todayEasternIso(now: Date = new Date()): string {
  return easternDateFormatter.format(now)
}

// Parse a `YYYY-MM-DD` into a UTC-midnight Date for calendar arithmetic. Using
// UTC throughout keeps date math free of DST shifts (we never touch time-of-day).
function parseIsoUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function todayEastern(now: Date = new Date()): ScheduledForRange {
  const today = todayEasternIso(now)
  return { start: today, end: today }
}

export function thisWeekEastern(now: Date = new Date()): ScheduledForRange {
  const today = parseIsoUtc(todayEasternIso(now))
  const start = new Date(today)
  start.setUTCDate(today.getUTCDate() - today.getUTCDay()) // back to Sunday
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6) // forward to Saturday
  return { start: toDateInputValue(start), end: toDateInputValue(end) }
}

export function thisMonthEastern(now: Date = new Date()): ScheduledForRange {
  const today = parseIsoUtc(todayEasternIso(now))
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  // Day 0 of next month == last day of this month.
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
  return { start: toDateInputValue(start), end: toDateInputValue(end) }
}
