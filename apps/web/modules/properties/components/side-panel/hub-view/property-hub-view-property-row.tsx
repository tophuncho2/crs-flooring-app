"use client"

import type { PropertyListRow } from "@builders/domain"

const EMPTY_CELL = "—"

export function PropertyHubViewPropertyRow({
  row,
  onClick,
}: {
  row: PropertyListRow
  onClick: (row: PropertyListRow) => void
}) {
  const address = row.fullAddress.trim().length > 0 ? row.fullAddress : EMPTY_CELL
  const phone = row.phone.trim()

  return (
    <button
      type="button"
      onClick={() => onClick(row)}
      className="grid w-full grid-cols-[1fr_auto] items-start gap-3 border-t border-blue-500/40 px-3 py-2 text-left transition first:border-t-0 hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm text-[var(--foreground)]/85">{row.name}</span>
        <span className="truncate text-xs text-[var(--foreground)]/55">{address}</span>
      </div>
      {phone.length > 0 ? (
        <span className="shrink-0 border-l border-blue-500/40 pl-3 text-xs tabular-nums text-[var(--foreground)]/70">
          {phone}
        </span>
      ) : null}
    </button>
  )
}
