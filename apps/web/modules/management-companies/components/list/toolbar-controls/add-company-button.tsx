"use client"

const BUTTON_CLASS_NAME =
  "flex h-full w-full items-center justify-center rounded-lg border border-sky-600 bg-sky-600 px-4 text-base font-semibold tracking-tight text-white shadow-sm transition hover:bg-sky-700 hover:border-sky-700 disabled:cursor-not-allowed disabled:opacity-50"

export type AddCompanyButtonProps = {
  onClick: () => void
  disabled?: boolean
}

/**
 * Toolbar action: opens the management-company side panel in create mode.
 * Rendered as a 2-row-tall card-style button — visually weighted to match
 * the inventory list's `Status` card. Designed to live as the sole child
 * of a `ListToolbarCell` so `h-full` stretches it to fill both rows.
 */
export function AddCompanyButton({ onClick, disabled }: AddCompanyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_CLASS_NAME}
    >
      + Company
    </button>
  )
}
