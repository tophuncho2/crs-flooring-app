"use client"

const OPEN_BUTTON_CLASS_NAME = [
  "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
  "bg-blue-500 text-black hover:bg-blue-400",
  "hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed",
].join(" ")

export type SidePanelPreviewOpenButtonProps = {
  disabled: boolean
  onClick: () => void
  label?: string
}

/**
 * Primary "open existing record" button for side-panel-preview footers.
 * Same blue accent chrome as the side-panel-edit save button.
 */
export function SidePanelPreviewOpenButton({
  disabled,
  onClick,
  label = "Open",
}: SidePanelPreviewOpenButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={OPEN_BUTTON_CLASS_NAME}
    >
      {label}
    </button>
  )
}
