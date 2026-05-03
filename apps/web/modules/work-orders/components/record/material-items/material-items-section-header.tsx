"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { SelectAllButton } from "@/components/features/select-batch"

export type MaterialItemsSectionHeaderProps = {
  itemsCount: number
  selectedCount: number
  eligibleSelectedCount: number
  eligibleCount: number
  canToggleSelection: boolean
  isSelectionActive: boolean
  isFinalizingInFlight: boolean
  isSaving: boolean
  isDirty: boolean
  hasConflict: boolean
  noticeMessage?: ReactNode
  error?: ReactNode
  onToggleSelectAll: () => void
  onFinalize: () => void
  onDiscard: () => void
  onSave: () => void
  onAddItem: () => void
}

export function MaterialItemsSectionHeader({
  itemsCount,
  selectedCount,
  eligibleSelectedCount,
  eligibleCount,
  canToggleSelection,
  isSelectionActive,
  isFinalizingInFlight,
  isSaving,
  isDirty,
  hasConflict,
  noticeMessage,
  error,
  onToggleSelectAll,
  onFinalize,
  onDiscard,
  onSave,
  onAddItem,
}: MaterialItemsSectionHeaderProps) {
  const finalizeButtonLabel = isFinalizingInFlight
    ? "Finalizing…"
    : `Finalize Selected (${eligibleSelectedCount})`
  const canFinalize = !isFinalizingInFlight && !isSaving && eligibleSelectedCount > 0

  return (
    <ActionHeader
      title="Material Items"
      summary={
        <span>
          {itemsCount} item{itemsCount === 1 ? "" : "s"}
          {selectedCount > 0
            ? ` · ${selectedCount} selected (${eligibleSelectedCount} eligible)`
            : ""}
        </span>
      }
      status={
        isSelectionActive && eligibleSelectedCount > 0
          ? {
              tone: "processing",
              label: "Ready to finalize",
              detail: "Worker will stamp before / after / finalCutSequence",
            }
          : undefined
      }
      extraActions={
        <>
          <button
            type="button"
            onClick={onFinalize}
            disabled={!canFinalize}
            aria-label={finalizeButtonLabel}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {finalizeButtonLabel}
          </button>
          <SelectAllButton
            isSelectionActive={isSelectionActive}
            selectedCount={selectedCount}
            eligibleCount={eligibleCount}
            canSelect={canToggleSelection}
            onToggle={onToggleSelectAll}
          />
        </>
      }
      actions={[
        {
          key: "discard-mi",
          label: "Discard",
          onClick: onDiscard,
          kind: "secondary",
          disabled: !isDirty || isSaving || isSelectionActive,
        },
        {
          key: "save-mi",
          label: isSaving ? "Saving…" : "Save Material Items",
          onClick: onSave,
          kind: "primary",
          disabled: !isDirty || isSaving || hasConflict || isSelectionActive,
        },
        {
          key: "add-mi",
          label: "+ Add Material Item",
          onClick: onAddItem,
          kind: "secondary",
          disabled: isSaving || isSelectionActive,
        },
      ]}
      message={noticeMessage}
      error={error}
    />
  )
}
