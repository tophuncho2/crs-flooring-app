"use client"

type Props = {
  disabled: boolean
  onClick: () => void
}

export function TemplateSyncPrevButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
    >
      Prev
    </button>
  )
}
