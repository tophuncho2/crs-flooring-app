"use client"

type Props = {
  page: number
  totalPages: number
}

export function TemplateSyncPageIndicator({ page, totalPages }: Props) {
  return (
    <span className="tabular-nums text-xs text-[var(--foreground)]/55">
      Page {page} of {totalPages}
    </span>
  )
}
