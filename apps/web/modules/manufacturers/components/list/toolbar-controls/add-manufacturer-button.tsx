"use client"

const BUTTON_CLASS_NAME =
  "flex w-full items-center justify-center rounded-lg border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-semibold tracking-tight text-white shadow-sm transition hover:bg-sky-700 hover:border-sky-700 disabled:cursor-not-allowed disabled:opacity-50"

export type AddManufacturerButtonProps = {
  onClick: () => void
  disabled?: boolean
}

/**
 * Toolbar action: opens the manufacturer side panel in create mode.
 * Card-style button sized to one toolbar row; lives inside a right-anchored
 * `ListToolbarCell` so it lines up with the top row of the search cell on
 * the left. Same chrome as `AddPropertyButton` / `AddWarehouseButton` for
 * visual parity across list views.
 */
export function AddManufacturerButton({ onClick, disabled }: AddManufacturerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_CLASS_NAME}
    >
      + Manufacturer
    </button>
  )
}
