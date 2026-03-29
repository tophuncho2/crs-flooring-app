"use client"

import type { ReactNode } from "react"
import type { RecordSectionError } from "../contracts"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
  RecordFooterPrimaryButton,
} from "../shell/record-action-buttons"
import { RecordSectionActionPanel } from "./record-section-action-panel"
import { RecordSectionSaveStateIndicators } from "./record-section-status-indicators"

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
    <RecordSectionActionPanel
      summary={summary}
      error={error ?? null}
      status={
        <RecordSectionSaveStateIndicators
          isDirty={isDirty}
          isSaving={isSaving}
          hasConflict={hasConflict}
          extra={statusExtra}
        />
      }
      actions={
        canManage ? (
          <>
            {extraActions}
            {onDelete ? (
              <RecordFooterDestructiveButton onClick={() => void onDelete()} disabled={isSaving}>
                {deleteLabel}
              </RecordFooterDestructiveButton>
            ) : null}
            <RecordFooterNeutralButton onClick={onDiscard} disabled={!isDirty || isSaving}>
              {discardLabel}
            </RecordFooterNeutralButton>
            <RecordFooterPrimaryButton onClick={() => void onSave()} disabled={!isDirty || isSaving}>
              {isSaving ? savingLabel : saveLabel}
            </RecordFooterPrimaryButton>
          </>
        ) : extraActions ? (
          <>{extraActions}</>
        ) : null
      }
    />
  )
}
