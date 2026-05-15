"use client"

import { RowActionButton } from "@/components/cells"

export type MaterialItemRemoveButtonProps = {
  editable: boolean
  onClick: () => void
}

export function MaterialItemRemoveButton({
  editable,
  onClick,
}: MaterialItemRemoveButtonProps) {
  return (
    <RowActionButton
      label="✕"
      ariaLabel="Remove material item"
      tone="destructive"
      title={editable ? "Remove this material item" : "Locked while section is busy"}
      editable={editable}
      onClick={onClick}
    />
  )
}
