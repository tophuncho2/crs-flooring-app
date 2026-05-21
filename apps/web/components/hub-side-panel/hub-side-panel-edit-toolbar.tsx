"use client"

import {
  SidePanelEditDeleteButton,
  SidePanelEditDiscardButton,
  SidePanelEditSaveButton,
  SidePanelEditStatusPill,
} from "@/components/side-panel-edit/controls"

export type HubSidePanelEditToolbarProps = {
  isDirty: boolean
  isSaving: boolean
  canSave?: boolean
  hasConflict?: boolean
  onSave: () => void
  onDiscard: () => void
  /** Omit to hide the delete button (e.g. in create mode). */
  onDelete?: () => void
  saveLabel?: string
  savingLabel?: string
  errorMessage?: string | null
}

/**
 * Top-of-panel edit toolbar: status pill on the left, Save / Discard /
 * Delete on the right. Replaces the legacy footer action bar — the hub
 * side-panel modes pin actions to the sticky header so they never overlap
 * scrolling content and always read as the section's controls.
 */
export function HubSidePanelEditToolbar({
  isDirty,
  isSaving,
  canSave = true,
  hasConflict = false,
  onSave,
  onDiscard,
  onDelete,
  saveLabel,
  savingLabel,
  errorMessage,
}: HubSidePanelEditToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SidePanelEditStatusPill
          isDirty={isDirty}
          isSaving={isSaving}
          hasConflict={hasConflict}
        />
        <div className="flex flex-wrap items-center gap-2">
          {onDelete ? (
            <SidePanelEditDeleteButton isSaving={isSaving} onClick={onDelete} />
          ) : null}
          <SidePanelEditDiscardButton
            isDirty={isDirty}
            isSaving={isSaving}
            onClick={onDiscard}
          />
          <SidePanelEditSaveButton
            isDirty={isDirty}
            isSaving={isSaving}
            canSave={canSave}
            onClick={onSave}
            label={saveLabel}
            savingLabel={savingLabel}
          />
        </div>
      </div>
      {errorMessage ? (
        <p className="text-xs text-rose-500" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
