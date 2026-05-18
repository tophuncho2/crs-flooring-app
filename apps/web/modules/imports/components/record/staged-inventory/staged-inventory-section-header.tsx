"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import {
  StagedInventoryExpandToggle,
  StagedInventorySelectionCluster,
  stagedInventorySectionActions,
} from "./toolbar-controls"

export type StagedInventorySectionHeaderProps = {
  filterRowsCount: number
  stagedRowsCount: number
  selectedCount: number
  eligibleSelectedCount: number
  eligibleCount: number
  canToggleSelection: boolean
  isSelectionActive: boolean
  isSaving: boolean
  isDirty: boolean
  isMarking: boolean
  hasConflict: boolean
  /** True when every filter row's staged-inventory sub-grid is expanded. */
  allExpanded: boolean
  /** Toggle all rows together: collapse-all when allExpanded, else expand-all. */
  onToggleAll: () => void
  onToggleSelection: () => void
  onAddFilterRow: () => void
  onDiscard: () => void
  onSave: () => void
  onRunImport: () => void
  noticeMessage?: ReactNode
  error?: ReactNode
}

export function StagedInventorySectionHeader({
  filterRowsCount,
  stagedRowsCount,
  selectedCount,
  eligibleSelectedCount,
  eligibleCount,
  canToggleSelection,
  isSelectionActive,
  isSaving,
  isDirty,
  isMarking,
  hasConflict,
  allExpanded,
  onToggleAll,
  onToggleSelection,
  onAddFilterRow,
  onDiscard,
  onSave,
  onRunImport,
  noticeMessage,
  error,
}: StagedInventorySectionHeaderProps) {
  return (
    <ActionHeader
      title="Staged Inventory"
      leadingControl={
        <StagedInventoryExpandToggle
          itemsCount={filterRowsCount}
          allExpanded={allExpanded}
          onToggle={onToggleAll}
        />
      }
      summary={
        <span>
          {filterRowsCount} filter row{filterRowsCount === 1 ? "" : "s"} ·{" "}
          {stagedRowsCount} staged row{stagedRowsCount === 1 ? "" : "s"}
          {selectedCount > 0
            ? ` · ${selectedCount} selected (${eligibleSelectedCount} eligible)`
            : ""}
        </span>
      }
      extraActions={
        <StagedInventorySelectionCluster
          selection={{
            isSelectionActive,
            selectedCount,
            eligibleCount,
            canToggleSelection,
            onToggleSelection,
          }}
          runImport={{
            eligibleSelectedCount,
            isMarking,
            isSaving,
            isDirty,
            onRunImport,
          }}
        />
      }
      actions={stagedInventorySectionActions({
        isSaving,
        isDirty,
        isMarking,
        isSelectionActive,
        hasConflict,
        onAddFilterRow,
        onDiscard,
        onSave,
      })}
      message={noticeMessage}
      error={error}
    />
  )
}
