"use client"

import { RecordDeleteButton } from "@/engines/common"

export type MaterialItemRemoveButtonProps = {
  editable: boolean
  onClick: () => void
}

export function MaterialItemRemoveButton({
  editable,
  onClick,
}: MaterialItemRemoveButtonProps) {
  return (
    <RecordDeleteButton
      ariaLabel="Remove material item"
      title={editable ? "Remove this material item" : "Locked while section is busy"}
      disabled={!editable}
      onClick={onClick}
    />
  )
}
