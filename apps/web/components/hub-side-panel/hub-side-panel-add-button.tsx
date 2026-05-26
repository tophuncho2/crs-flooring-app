"use client"

const BUTTON_CLASS_NAME =
  "inline-flex items-center justify-center rounded-md border border-sky-500/60 bg-[var(--panel-background)] px-2.5 py-1 text-xs font-semibold tracking-tight text-sky-700 shadow-sm transition hover:bg-sky-500/10 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50"

export type HubSidePanelAddButtonProps = {
  onClick: () => void
  disabled?: boolean
  label?: string
}

/**
 * Always-available action that opens the hub create form. Rendered in the
 * panel title row (just left of the close button) via the shell's `titleEnd`
 * slot, so it is shared and identical across every panel connected to the
 * property hub.
 */
export function HubSidePanelAddButton({
  onClick,
  disabled,
  label = "+ Hub",
}: HubSidePanelAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_CLASS_NAME}
    >
      {label}
    </button>
  )
}
