"use client"

import type { ReactNode } from "react"
import type { RecordSectionError } from "@/types/record/section-error"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
} from "../structure/record-section-tokens"
import { RecordSectionShell } from "../structure/record-section-shell"
import { RecordSectionNoticeStrip } from "../structure/record-section-notice-strip"
import { TableBleed } from "../structure/table-bleed"
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
  noticeInfo?: string
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
  flush?: boolean
  capabilities?: RecordSectionCapabilities
  statusExtra?: ReactNode
  actions?: RecordSectionSubHeaderProps["actions"]
  actionsLeading?: ReactNode
  actionsTrailing?: ReactNode
}

export function RecordFieldSection({
  title,
  children,
  metrics,
  summary,
  error,
  noticeMessage,
  noticeError,
  noticeInfo,
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
  flush = false,
  capabilities,
  statusExtra,
  actions = [],
  actionsLeading,
  actionsTrailing,
}: RecordFieldSectionProps) {
  const resolvedCapabilities = resolveRecordSectionCapabilities("field", capabilities)

  const actionPanel = (
    <RecordSectionSubHeader
      sectionType="field"
      capabilities={resolvedCapabilities}
      summary={summary}
      error={error ?? null}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      noticeInfo={noticeInfo}
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
      actionsLeading={actionsLeading}
      actionsTrailing={actionsTrailing}
    />
  )

  if (!showHeader) {
    return (
      <TableBleed variant="record">
        {actionPanel}
        {/* Headerless section: notices surface in a standalone strip above the
            body (no header band to host them). */}
        <RecordSectionNoticeStrip
          message={noticeMessage}
          error={error}
          noticeError={noticeError}
          info={noticeInfo}
        />
        <div
          className={joinRecordSectionClasses(
            flush ? "px-0 py-5 space-y-0" : "px-5 py-5 space-y-0",
            RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
          )}
        >
          {children}
        </div>
      </TableBleed>
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
      noticeInfo={noticeInfo}
      error={error}
      flush={flush}
      sectionType="field"
      capabilities={resolvedCapabilities}
    >
      {children}
    </RecordSectionShell>
  )
}
