"use client"

import { SidePanelEditActionBar } from "@/components/side-panel-edit"

export type WarehouseSidePanelActionButtonsProps = {
  mode: "create" | "edit"
  isDirty: boolean
  isSaving: boolean
  canSave: boolean
  hasConflict?: boolean
  onSave: () => void
  onDiscard: () => void
  onDelete: () => void
}

/**
 * Footer action strip for the warehouse side panel. Thin adapter over the
 * shared `SidePanelEditActionBar` primitive — owns the create/edit label
 * swap and hides Delete in create mode. Close is handled by the side panel's
 * title bar (X / backdrop / Escape), so there is no Cancel button here.
 */
export function WarehouseSidePanelActionButtons({
  mode,
  isDirty,
  isSaving,
  canSave,
  hasConflict = false,
  onSave,
  onDiscard,
  onDelete,
}: WarehouseSidePanelActionButtonsProps) {
  const isCreate = mode === "create"

  return (
    <SidePanelEditActionBar
      isDirty={isCreate ? true : isDirty}
      isSaving={isSaving}
      hasConflict={hasConflict}
      canSave={canSave}
      onSave={onSave}
      onDiscard={onDiscard}
      onDelete={isCreate ? undefined : onDelete}
      saveLabel={isCreate ? "Create" : "Save"}
      savingLabel={isCreate ? "Creating…" : "Saving…"}
    />
  )
}
