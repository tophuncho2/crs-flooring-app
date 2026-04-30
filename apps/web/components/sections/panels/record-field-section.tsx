"use client"

import type { ReactNode } from "react"
import type { RecordSectionError } from "@/modules/shared/engines/record-view/contracts"
import { RecordFormNotices } from "@/components/feedback/notices/record-form-notices"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
} from "../structure/record-section-tokens"
import { RecordSectionShell } from "../structure/record-section-shell"
import {
  RecordSectionSubHeader,
  type RecordSectionSubHeaderProps,
} from "../structure/record-section-sub-header"
import {
  resolveRecordSectionCapabilities,
  type RecordSectionCapabilities,
} from "../structure/record-section-capabilities"

export type RecordFieldSectionProps = {
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
  capabilities?: RecordSectionCapabilities
  statusExtra?: ReactNode
  actions?: RecordSectionSubHeaderProps["actions"]
}

export function RecordFieldSection({
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
  capabilities,
  statusExtra,
  actions = [],
}: RecordFieldSectionProps) {
  const resolvedCapabilities = resolveRecordSectionCapabilities("field", capabilities)

  const actionPanel = (
    <RecordSectionSubHeader
      sectionType="field"
      capabilities={resolvedCapabilities}
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
      statusExtra={statusExtra}
      actions={actions}
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
      sectionType="field"
      capabilities={resolvedCapabilities}
    >
      {children}
    </RecordSectionShell>
  )
}
