"use client"

export type CutLogRowToolbarProps = {
  workOrderItemId: string
  isSectionBusy: boolean
  onCreateNew: (workOrderItemId: string) => void
}

// Right-aligned control cluster shown under each material item's cut-log
// sub-grid: just the create-new button.
export function CutLogRowToolbar({
  workOrderItemId,
  isSectionBusy,
  onCreateNew,
}: CutLogRowToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs">
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
