"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { ExpandToggle } from "@/components/grid/expandable-rows"
import { materialItemsSectionActions } from "./toolbar-controls"

export type MaterialItemsSectionHeaderProps = {
  itemsCount: number
  isSaving: boolean
  isDirty: boolean
  hasConflict: boolean
  /** True when every material item's cut-log sub-grid is expanded. */
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
        itemsCount > 0 ? (
          <ExpandToggle
            expanded={allExpanded}
            onToggle={onToggleAll}
            ariaLabel={allExpanded ? "Collapse all material items" : "Expand all material items"}
          />
        ) : null
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
