"use client"

import { AttachCutLogPicker } from "./attach-cut-log-picker"

export type CutLogRowToolbarProps = {
  workOrderItemId: string
  isSectionBusy: boolean
  onCreateNew: (workOrderItemId: string) => void
}

// Right-aligned control cluster shown under each material item's cut-log
// sub-grid: attach-existing picker (placeholder) + create-new button.
export function CutLogRowToolbar({
  workOrderItemId,
  isSectionBusy,
  onCreateNew,
}: CutLogRowToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs">
      <AttachCutLogPicker workOrderItemId={workOrderItemId} disabled={isSectionBusy} />
      <button
        type="button"
        className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onCreateNew(workOrderItemId)}
        disabled={isSectionBusy}
      >
        + Add Cut Log
      </button>
    </div>
  )
}
