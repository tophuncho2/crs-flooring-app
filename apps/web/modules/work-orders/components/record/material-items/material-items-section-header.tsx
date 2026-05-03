"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"

export type MaterialItemsSectionHeaderProps = {
  itemsCount: number
  isSaving: boolean
  isDirty: boolean
  hasConflict: boolean
  noticeMessage?: ReactNode
  error?: ReactNode
  onDiscard: () => void
  onSave: () => void
  onAddItem: () => void
}

export function MaterialItemsSectionHeader({
  itemsCount,
  isSaving,
  isDirty,
  hasConflict,
  noticeMessage,
  error,
  onDiscard,
  onSave,
  onAddItem,
}: MaterialItemsSectionHeaderProps) {
  return (
    <ActionHeader
      title="Material Items"
      summary={
        <span>
          {itemsCount} item{itemsCount === 1 ? "" : "s"}
        </span>
      }
      actions={[
        {
          key: "discard-mi",
          label: "Discard",
          onClick: onDiscard,
          kind: "secondary",
          disabled: !isDirty || isSaving,
        },
        {
          key: "save-mi",
          label: isSaving ? "Saving…" : "Save Material Items",
          onClick: onSave,
          kind: "primary",
          disabled: !isDirty || isSaving || hasConflict,
        },
        {
          key: "add-mi",
          label: "+ Add Material Item",
          onClick: onAddItem,
          kind: "secondary",
          disabled: isSaving,
        },
      ]}
      message={noticeMessage}
      error={error}
    />
  )
}
