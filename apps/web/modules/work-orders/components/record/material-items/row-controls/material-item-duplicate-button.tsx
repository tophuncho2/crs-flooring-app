"use client"

import { DuplicateRowButton } from "@/components/features/duplicate-row"

export type MaterialItemDuplicateButtonProps = {
  editable: boolean
  onClick: () => void
}

export function MaterialItemDuplicateButton({
  editable,
  onClick,
}: MaterialItemDuplicateButtonProps) {
  return (
    <DuplicateRowButton
      ariaLabel="Duplicate material item"
      title={editable ? "Duplicate this material item" : "Locked while section is busy"}
      editable={editable}
      onClick={onClick}
    />
  )
}
