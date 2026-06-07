"use client"

const BUTTON_CLASS_NAME =
  "flex w-full items-center justify-center rounded-lg border border-sky-500/60 bg-[var(--panel-background)] px-4 py-2 text-sm font-semibold tracking-tight text-sky-700 shadow-sm transition hover:bg-sky-500/10 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50"

export type AddHubButtonProps = {
  onClick?: () => void
  disabled?: boolean
}

/**
 * Toolbar action: opens the unified hub side panel in create mode. Card-
 * style button sized to one toolbar row; the canonical (and only) entry
 * point for creating a management company + property pair from this list.
 */
export function AddHubButton({ onClick, disabled }: AddHubButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled ?? !onClick}
      className={BUTTON_CLASS_NAME}
    >
      + Management
    </button>
  )
}
