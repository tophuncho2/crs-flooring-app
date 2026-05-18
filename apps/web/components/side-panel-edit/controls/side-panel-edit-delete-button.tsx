"use client"

const DELETE_BUTTON_CLASS_NAME = [
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all duration-200",
  "border-rose-500/40 bg-[var(--panel-background)] text-rose-500",
  "hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400 hover:shadow-[0_0_18px_rgba(244,63,94,0.18)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "disabled:hover:border-rose-500/40 disabled:hover:bg-[var(--panel-background)] disabled:hover:text-rose-500 disabled:hover:shadow-none",
].join(" ")

export type SidePanelEditDeleteButtonProps = {
  isSaving: boolean
  disabled?: boolean
  onClick: () => void | Promise<void>
  label?: string
  title?: string
}

/**
 * Destructive delete button for side-panel edit flows. Disabled while a
 * mutation is in flight so a record cannot be deleted mid-save.
 */
export function SidePanelEditDeleteButton({
  isSaving,
  disabled,
  onClick,
  label = "Delete",
  title,
}: SidePanelEditDeleteButtonProps) {
  const isDisabled = disabled ?? isSaving

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={isDisabled}
      title={title}
      className={DELETE_BUTTON_CLASS_NAME}
    >
      {label}
    </button>
  )
}
