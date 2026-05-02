// Pure UI helper. Centralizes the ISO-string → display-string conversion
// previously duplicated in inventory-cut-logs-section.tsx, inventory-
// historical-cut-logs-section.tsx, and inline in the WO cut-log row.
//
// Falls back to an em-dash for null / undefined / unparseable input so the
// grid renders consistent visual width even when a timestamp is missing.

const EMPTY = "—"

export function formatCutLogTimestamp(iso: string | undefined | null): string {
  if (!iso) return EMPTY
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}
