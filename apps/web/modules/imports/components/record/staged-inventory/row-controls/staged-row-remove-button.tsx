"use client"

import { RecordDeleteButton } from "@/engines/common"

export type StagedRowRemoveButtonProps = {
  isEditable: boolean
  isSectionBusy: boolean
  onClick: () => void
}

/** Gutter delete for a staged-inventory row (any state except QUEUED) — common destructive preset. */
export function StagedRowRemoveButton({
  isEditable,
  isSectionBusy,
  onClick,
}: StagedRowRemoveButtonProps) {
  const enabled = isEditable && !isSectionBusy
  return (
    <RecordDeleteButton
      onClick={onClick}
      disabled={!enabled}
      ariaLabel="Delete staged row"
      title={isEditable ? "Delete this row" : "Queued rows can't be deleted"}
    />
  )
}
