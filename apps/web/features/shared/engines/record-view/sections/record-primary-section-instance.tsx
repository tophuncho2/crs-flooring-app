"use client"

import type { ReactNode } from "react"
import { RecordSectionActionPanel } from "./record-section-action-panel"
import { RecordSectionShell } from "./record-section-shell"
import { RecordSectionSaveStateIndicators } from "./record-section-status-indicators"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
} from "./record-section-tokens"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
  RecordFooterPrimaryButton,
} from "../shell/record-action-buttons"
import type { RecordSectionError } from "../contracts"

export function RecordPrimarySectionInstance({
  title,
  children,
  metrics,
  summary,
  error,
  isDirty,
  isSaving,
  hasConflict,
  canManage = true,
  onSave,
  onDiscard,
  onDelete,
  saveLabel = "Save",
  savingLabel = "Saving...",
  discardLabel = "Discard",
  deleteLabel = "Delete",
  showHeader = true,
}: {
  title: string
  children: ReactNode
  metrics?: ReactNode
  summary?: ReactNode
  error?: ReactNode | RecordSectionError | null
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  canManage?: boolean
  onSave: () => void | Promise<void>
  onDiscard: () => void
  onDelete?: () => void | Promise<void>
  saveLabel?: string
  savingLabel?: string
  discardLabel?: string
  deleteLabel?: string
  showHeader?: boolean
}) {
  const actionPanel = (
    <RecordSectionActionPanel
      summary={summary}
      error={error ?? null}
      status={
        <RecordSectionSaveStateIndicators
          isDirty={isDirty}
          isSaving={isSaving}
          hasConflict={hasConflict}
        />
      }
      actions={
        canManage ? (
          <>
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
        ) : null
      }
    />
  )

  if (!showHeader) {
    return (
      <>
        {actionPanel}
        <div className={joinRecordSectionClasses("px-5 py-5 space-y-0", RECORD_SECTION_BODY_SURFACE_CLASS_NAME)}>
          {children}
        </div>
      </>
    )
  }

  return (
    <RecordSectionShell title={title} metrics={metrics} bodyClassName="space-y-0" statusPanel={actionPanel}>
      {children}
    </RecordSectionShell>
  )
}
