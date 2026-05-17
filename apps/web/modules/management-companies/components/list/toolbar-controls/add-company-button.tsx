"use client"

const BUTTON_CLASS_NAME =
  "flex w-full items-center justify-center rounded-lg border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-semibold tracking-tight text-white shadow-sm transition hover:bg-sky-700 hover:border-sky-700 disabled:cursor-not-allowed disabled:opacity-50"

export type AddCompanyButtonProps = {
  onClick: () => void
  disabled?: boolean
}

/**
 * Toolbar action: opens the management-company side panel in create mode.
 * Card-style button sized to one toolbar row; designed to live stacked
 * above `AddHubButton` inside a single `ListToolbarCell`.
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
