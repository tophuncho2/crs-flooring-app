"use client"

const SAVE_BUTTON_CLASS_NAME = [
  "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
  "bg-blue-500 text-black hover:bg-blue-400",
  "hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed",
].join(" ")

export type SidePanelEditSaveButtonProps = {
  isDirty: boolean
  isSaving: boolean
  canSave?: boolean
  disabled?: boolean
  onClick: () => void | Promise<void>
  label?: string
  savingLabel?: string
  title?: string
}

/**
 * Primary save button for side-panel edit flows. Derives `disabled` from
 * dirty + saving + canSave by default; consumers can force-disable via the
 * `disabled` prop. Label swaps to `savingLabel` while a mutation is in
 * flight.
 */
export function SidePanelEditSaveButton({
  isDirty,
  isSaving,
  canSave = true,
  disabled,
  onClick,
  label = "Save",
  savingLabel = "Saving...",
  title,
}: SidePanelEditSaveButtonProps) {
  const isDisabled = disabled ?? (!isDirty || isSaving || !canSave)

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={isDisabled}
      title={title}
      className={SAVE_BUTTON_CLASS_NAME}
    >
      {isSaving ? savingLabel : label}
    </button>
  )
}
