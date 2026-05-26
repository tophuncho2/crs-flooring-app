"use client"

const BUTTON_CLASS_NAME =
  "flex w-full items-center justify-center rounded-md border border-sky-500/60 bg-[var(--panel-background)] px-3 py-1.5 text-sm font-semibold tracking-tight text-sky-700 shadow-sm transition hover:bg-sky-500/10 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50"

export type HubSidePanelAddButtonProps = {
  onClick: () => void
  disabled?: boolean
  label?: string
}

/**
 * In-panel action button that opens the hub create form. Lives in the
 * view-mode top toolbar where the pagination row used to be; sized
 * consistently across both the Properties and Templates tabs.
 */
export function HubSidePanelAddButton({
  onClick,
  disabled,
  label = "+ Hub form",
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
