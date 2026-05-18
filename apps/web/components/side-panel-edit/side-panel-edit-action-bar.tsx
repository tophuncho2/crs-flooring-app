"use client"

import type { ReactNode } from "react"
import {
  SidePanelEditDeleteButton,
  SidePanelEditDiscardButton,
  SidePanelEditSaveButton,
  SidePanelEditStatusPill,
} from "./controls"

export type SidePanelEditActionBarProps = {
  isDirty: boolean
  isSaving: boolean
  hasConflict?: boolean
  canSave?: boolean
  canManage?: boolean
  onSave: () => void | Promise<void>
  onDiscard: () => void
  onDelete?: () => void | Promise<void>
  saveLabel?: string
  savingLabel?: string
  discardLabel?: string
  deleteLabel?: string
  showStatus?: boolean
  statusExtra?: ReactNode
  error?: ReactNode
}

/**
 * Default footer action bar for `SidePanelPreview`-based edit panels.
 * Composes the per-control primitives from `./controls/` into the standard
 * "status pill on the left, Save / Discard / Delete on the right" layout.
 *
 * Modules with bespoke layout (mode-specific buttons, extra controls) can
 * skip this composite and assemble the per-control primitives directly
 * inside the side panel footer slot.
 */
export function SidePanelEditActionBar({
  isDirty,
  isSaving,
  hasConflict = false,
  canSave = true,
  canManage = true,
  onSave,
  onDiscard,
  onDelete,
  saveLabel,
  savingLabel,
  discardLabel,
  deleteLabel,
  showStatus = true,
  statusExtra,
  error,
}: SidePanelEditActionBarProps) {
  const managedActions = canManage ? (
    <>
      {onDelete ? (
        <SidePanelEditDeleteButton
          isSaving={isSaving}
          onClick={onDelete}
          label={deleteLabel}
        />
      ) : null}
      <SidePanelEditDiscardButton
        isDirty={isDirty}
        isSaving={isSaving}
        onClick={onDiscard}
        label={discardLabel}
      />
      <SidePanelEditSaveButton
        isDirty={isDirty}
        isSaving={isSaving}
        canSave={canSave}
        onClick={onSave}
        label={saveLabel}
        savingLabel={savingLabel}
      />
    </>
  ) : null

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-3">
        {showStatus ? (
          <div className="flex flex-wrap items-center gap-2">
            <SidePanelEditStatusPill
              isDirty={isDirty}
              isSaving={isSaving}
              hasConflict={hasConflict}
              extra={statusExtra}
            />
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>
      {managedActions ? (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{managedActions}</div>
      ) : null}
    </div>
  )
}
