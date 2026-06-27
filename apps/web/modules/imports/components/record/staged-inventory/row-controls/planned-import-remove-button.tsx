"use client"

import { RecordDeleteButton } from "@/engines/common"

export type PlannedImportRemoveButtonProps = {
  editable: boolean
  onClick: () => void
}

/** Gutter delete for a Planned Import (filter) row — common destructive preset. */
export function PlannedImportRemoveButton({
  editable,
  onClick,
}: PlannedImportRemoveButtonProps) {
  return (
    <RecordDeleteButton
      onClick={onClick}
      disabled={!editable}
      ariaLabel="Remove planned import"
      title={editable ? "Remove this planned import" : "Locked while section is busy"}
    />
  )
}
