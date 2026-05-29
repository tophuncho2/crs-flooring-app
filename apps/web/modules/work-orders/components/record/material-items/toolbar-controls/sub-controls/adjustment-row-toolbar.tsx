"use client"

export type AdjustmentRowToolbarProps = {
  workOrderItemId: string
  isSectionBusy: boolean
  onCreateNew: (workOrderItemId: string) => void
}

// Left-aligned control cluster shown under each material item's adjustment
// sub-grid: just the create-new button.
export function AdjustmentRowToolbar({
  workOrderItemId,
  isSectionBusy,
  onCreateNew,
}: AdjustmentRowToolbarProps) {
  return (
    <div className="flex items-center justify-start gap-2 text-xs">
      <button
        type="button"
        className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onCreateNew(workOrderItemId)}
        disabled={isSectionBusy}
      >
        + Add Adjustment
      </button>
    </div>
  )
}
