"use client"

import type { ReactNode } from "react"
import type { RecordSectionError } from "../contracts"
import { RecordSectionSubHeader } from "../structure/record-section-sub-header"

export function RecordManagedSectionActionPanel({
  summary,
  error,
  isDirty,
  isSaving,
  hasConflict,
  onSave,
  onDiscard,
  onDelete,
  saveLabel = "Save",
  savingLabel = "Saving...",
  discardLabel = "Discard",
  deleteLabel = "Delete",
  extraActions,
  statusExtra,
  canManage = true,
}: {
  summary?: ReactNode
  error?: ReactNode | RecordSectionError | null
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  onSave: () => void | Promise<void>
  onDiscard: () => void
  onDelete?: () => void | Promise<void>
  saveLabel?: string
  savingLabel?: string
  discardLabel?: string
  deleteLabel?: string
  extraActions?: ReactNode
  statusExtra?: ReactNode
  canManage?: boolean
}) {
  return (
    <RecordSectionSubHeader
      summary={summary}
      error={error ?? null}
      isDirty={isDirty}
      isSaving={isSaving}
      hasConflict={hasConflict}
      onSave={onSave}
      onDiscard={onDiscard}
      onDelete={onDelete}
      saveLabel={saveLabel}
      savingLabel={savingLabel}
      discardLabel={discardLabel}
      deleteLabel={deleteLabel}
      statusExtra={statusExtra}
      canManage={canManage}
      actions={[]}
    />
  )
}
