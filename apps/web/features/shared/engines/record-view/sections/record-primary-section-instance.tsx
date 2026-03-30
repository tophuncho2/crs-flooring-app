"use client"

import type { ReactNode } from "react"
import { RecordFormNotices } from "../feedback"
import { RecordSectionSubHeader } from "./record-section-sub-header"
import { RecordSectionShell } from "./record-section-shell"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
} from "./record-section-tokens"
import type { RecordSectionError } from "../contracts"

export function RecordPrimarySectionInstance({
  title,
  children,
  metrics,
  summary,
  error,
  noticeMessage,
  noticeError,
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
  noticeMessage?: string
  noticeError?: string
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
    <RecordSectionSubHeader
      summary={summary}
      error={error ?? null}
      isDirty={isDirty}
      isSaving={isSaving}
      hasConflict={hasConflict}
      canManage={canManage}
      onSave={onSave}
      onDiscard={onDiscard}
      onDelete={onDelete}
      saveLabel={saveLabel}
      savingLabel={savingLabel}
      discardLabel={discardLabel}
      deleteLabel={deleteLabel}
    />
  )

  if (!showHeader) {
    return (
      <>
        {actionPanel}
        <RecordFormNotices message={noticeMessage} error={noticeError} />
        <div className={joinRecordSectionClasses("px-5 py-5 space-y-0", RECORD_SECTION_BODY_SURFACE_CLASS_NAME)}>
          {children}
        </div>
      </>
    )
  }

  return (
    <RecordSectionShell
      title={title}
      metrics={metrics}
      bodyClassName="space-y-0"
      statusPanel={actionPanel}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
    >
      {children}
    </RecordSectionShell>
  )
}
