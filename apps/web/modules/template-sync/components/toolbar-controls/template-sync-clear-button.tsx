"use client"

type Props = {
  disabled: boolean
  onClick: () => void
}

export function TemplateSyncClearButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
    >
      Clear
    </button>
  )
}
