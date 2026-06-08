"use client"

import { RowActionButton } from "@/engines/record-view"

export type FilterRowRemoveButtonProps = {
  editable: boolean
  title: string
  onClick: () => void
}

export function FilterRowRemoveButton({
  editable,
  title,
  onClick,
}: FilterRowRemoveButtonProps) {
  return (
    <RowActionButton
      label="✕"
      ariaLabel="Remove filter row"
      tone="destructive"
      title={title}
      editable={editable}
      onClick={onClick}
    />
  )
}
