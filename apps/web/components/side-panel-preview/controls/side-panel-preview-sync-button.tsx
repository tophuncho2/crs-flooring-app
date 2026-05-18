"use client"

const SYNC_BUTTON_CLASS_NAME = [
  "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
  "bg-blue-500 text-black hover:bg-blue-400",
  "hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed",
].join(" ")

export type SidePanelPreviewSyncButtonProps = {
  disabled: boolean
  isSyncing: boolean
  onClick: () => void
  label?: string
  syncingLabel?: string
}

/**
 * Primary "sync / commit" button for side-panel-preview footers. Swaps
 * label to `syncingLabel` while a mutation is in flight; same blue accent
 * chrome as the side-panel-edit save button.
 */
export function SidePanelPreviewSyncButton({
  disabled,
  isSyncing,
  onClick,
  label = "Sync",
  syncingLabel = "Syncing…",
}: SidePanelPreviewSyncButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={SYNC_BUTTON_CLASS_NAME}
    >
      {isSyncing ? syncingLabel : label}
    </button>
  )
}
