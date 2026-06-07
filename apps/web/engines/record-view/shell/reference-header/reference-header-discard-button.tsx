"use client"

const DISCARD_BUTTON_CLASS_NAME = [
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all duration-200",
  "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80",
  "hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] hover:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "disabled:hover:border-[var(--panel-border)] disabled:hover:bg-[var(--panel-background)] disabled:hover:text-[var(--foreground)]/80 disabled:hover:shadow-none",
].join(" ")

export type ReferenceHeaderDiscardButtonProps = {
  disabled: boolean
  onClick: () => void
  label?: string
}

/**
 * Neutral "discard" button for record-view reference-header actions. Lets a
 * reference header cancel an in-progress re-pick and restore the previously
 * selected record (the consumer wires `onClick` to its restore logic). Sibling
 * of `ReferenceHeaderClearButton`, sharing the same neutral chrome.
 */
export function ReferenceHeaderDiscardButton({
  disabled,
  onClick,
  label = "Discard",
}: ReferenceHeaderDiscardButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={DISCARD_BUTTON_CLASS_NAME}
    >
      {label}
    </button>
  )
}
