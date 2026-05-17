"use client"

const BUTTON_CLASS_NAME =
  "inline-flex h-9 items-center justify-center rounded-md bg-sky-600 px-3 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"

export type AddCompanyButtonProps = {
  onClick: () => void
  disabled?: boolean
}

/**
 * Toolbar action: opens the management-company side panel in create mode.
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
