"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/engines/common"
import {
  MaterialItemsExpandToggle,
  materialItemsSectionActions,
} from "./toolbar-controls"

export type MaterialItemsSectionHeaderProps = {
  itemsCount: number
  isSaving: boolean
  isDirty: boolean
  hasConflict: boolean
  /** True when every material item's adjustment sub-grid is expanded. */
  allExpanded: boolean
  /** Toggle all rows together: collapse-all when allExpanded, else expand-all. */
  onToggleAll: () => void
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
  allExpanded,
  onToggleAll,
  noticeMessage,
  error,
  onDiscard,
  onSave,
  onAddItem,
}: MaterialItemsSectionHeaderProps) {
  return (
    <ActionHeader
      title="Material Items"
      leadingControl={
        <MaterialItemsExpandToggle
          itemsCount={itemsCount}
          allExpanded={allExpanded}
          onToggle={onToggleAll}
        />
      }
      summary={
        <span>
          {itemsCount} item{itemsCount === 1 ? "" : "s"}
        </span>
      }
      actions={materialItemsSectionActions({
        isSaving,
        isDirty,
        hasConflict,
        onDiscard,
        onSave,
        onAddItem,
      })}
      message={noticeMessage}
      error={error}
    />
  )
}
