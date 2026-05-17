"use client"

const BUTTON_CLASS_NAME =
  "flex h-full w-full items-center justify-center rounded-lg border border-sky-500/60 bg-[var(--panel-background)] px-4 text-base font-semibold tracking-tight text-sky-700 shadow-sm transition hover:bg-sky-500/10 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50"

export type AddHubButtonProps = {
  onClick?: () => void
  disabled?: boolean
}

/**
 * Toolbar action placeholder for the future Property Hub create flow.
 * Rendered as a 2-row-tall card-style button — visually weighted to match
 * the inventory list's `Status` card. Designed to live as the sole child
 * of a `ListToolbarCell` so `h-full` stretches it to fill both rows. Uses
 * the outlined variant to read as the secondary action next to + Company.
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
