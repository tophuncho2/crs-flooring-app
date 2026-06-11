"use client"

const BUTTON_CLASS_NAME =
  "flex w-full items-center justify-center rounded-lg border border-sky-600/60 bg-transparent px-4 py-2 text-sm font-semibold tracking-tight text-sky-700 shadow-sm transition hover:border-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-300 dark:hover:bg-sky-950/40"

export type MergeInventoryButtonProps = {
  onClick: () => void
  disabled?: boolean
}

/**
 * Toolbar action: opens the merge-inventory form (`/dashboard/inventory/merge`).
 * Sits directly under `AddInventoryButton`; outlined (secondary) chrome so it
 * reads as a companion to the primary "+ Inventory" create action.
 */
export function MergeInventoryButton({ onClick, disabled }: MergeInventoryButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={BUTTON_CLASS_NAME}>
      Merge
    </button>
  )
}
