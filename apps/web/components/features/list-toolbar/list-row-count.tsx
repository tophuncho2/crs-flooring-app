"use client"

export type ListRowCountProps = {
  count: number
  total: number
  label: string
}

/**
 * Typed `{count} of {total} {label}` stat span. Shared across list views
 * so the row count reads the same everywhere.
 */
export function ListRowCount({ count, total, label }: ListRowCountProps) {
  return (
    <span className="text-xs text-[var(--foreground)]/55">
      {count} of {total} {label}
    </span>
  )
}
