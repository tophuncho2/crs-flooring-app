"use client"

export function WorkOrderFilesRefreshButton({
  disabled,
  isRefreshing,
  onClick,
}: {
  disabled: boolean
  isRefreshing: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:bg-[var(--panel-border)]/15 focus:outline-none focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRefreshing ? "Refreshing…" : "Refresh"}
    </button>
  )
}
