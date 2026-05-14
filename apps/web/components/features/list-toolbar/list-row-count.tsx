"use client"

export type ListRowCountProps = {
  count: number
  total: number
  label: string
}

/**
 * Typed `{count} of {total} {label}` stat span. Shared across list views
 * so the row count reads the same everywhere. Both numbers are formatted
 * with locale-aware thousand separators.
 */
export function ListRowCount({ count, total, label }: ListRowCountProps) {
  return (
    <span className="whitespace-nowrap text-xs text-[var(--foreground)]/55 tabular-nums">
      {count.toLocaleString()} of {total.toLocaleString()} {label}
    </span>
  )
}
