"use client"

import { DuplicateRowButton } from "@/components/features/duplicate-row"

export type StagedRowDuplicateButtonProps = {
  isDraft: boolean
  isSectionBusy: boolean
  onClick: () => void
}

export function StagedRowDuplicateButton({
  isDraft,
  isSectionBusy,
  onClick,
}: StagedRowDuplicateButtonProps) {
  return (
    <DuplicateRowButton
      ariaLabel="Duplicate row"
      title={isDraft ? "Duplicate this row" : "Only draft rows can be duplicated"}
      editable={isDraft && !isSectionBusy}
      onClick={onClick}
    />
  )
}
