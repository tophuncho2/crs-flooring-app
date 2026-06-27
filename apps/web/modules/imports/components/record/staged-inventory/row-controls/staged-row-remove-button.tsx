"use client"

import { RecordDeleteButton } from "@/engines/common"

export type StagedRowRemoveButtonProps = {
  isDraft: boolean
  isSectionBusy: boolean
  onClick: () => void
}

/** Gutter delete for a staged-inventory row (DRAFT only) — common destructive preset. */
export function StagedRowRemoveButton({
  isDraft,
  isSectionBusy,
  onClick,
}: StagedRowRemoveButtonProps) {
  const enabled = isDraft && !isSectionBusy
  return (
    <RecordDeleteButton
      onClick={onClick}
      disabled={!enabled}
      ariaLabel="Delete staged row"
      title={isDraft ? "Delete this row" : "Only draft rows can be deleted"}
    />
  )
}
