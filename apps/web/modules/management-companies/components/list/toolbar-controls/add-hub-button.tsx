"use client"

const BUTTON_CLASS_NAME =
  "inline-flex h-9 items-center justify-center rounded-md border border-sky-500/45 bg-[var(--panel-background)] px-3 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"

export type AddHubButtonProps = {
  onClick?: () => void
  disabled?: boolean
}

/**
 * Toolbar action placeholder for the future Property Hub create flow.
 * No-op until the hub form lands.
 */
export function AddHubButton({ onClick, disabled }: AddHubButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled ?? !onClick}
      className={BUTTON_CLASS_NAME}
    >
      + Hub
    </button>
  )
}
