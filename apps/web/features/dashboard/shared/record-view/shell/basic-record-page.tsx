"use client"

import type { ReactNode } from "react"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { RECORD_DETAIL_PANEL_WIDTH_CLASS } from "@/features/dashboard/shared/record-view/shell/record-panel-width"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"

export function BasicRecordPage({
  title,
  backHref,
  children,
  message,
  error,
  loadingMessage,
  headerMeta,
  headerActions,
  saveLabel,
  savingLabel,
  deleteLabel,
  deleteConfirmMessage,
  onSave,
  onDelete,
  onClose,
  isSaving = false,
  sizeClass = RECORD_DETAIL_PANEL_WIDTH_CLASS,
}: {
  title: string
  backHref: string
  children: ReactNode
  message?: string
  error?: string
  loadingMessage?: string
  headerMeta?: ReactNode
  headerActions?: ReactNode
  saveLabel: string
  savingLabel: string
  deleteLabel: string
  deleteConfirmMessage: string
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  isSaving?: boolean
  sizeClass?: string
}) {
  return (
    <RecordDetailPageShell
      title={title}
      backHref={backHref}
      onBack={onClose}
      headerMeta={headerMeta}
      headerActions={headerActions}
      sizeClass={sizeClass}
    >
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} loadingMessage={loadingMessage} />
        {children}
        <RecordPanelFooter
          deleteLabel={deleteLabel}
          deleteConfirmMessage={deleteConfirmMessage}
          onDelete={onDelete}
          onClose={onClose}
          closeLabel="Back"
          saveLabel={saveLabel}
          savingLabel={savingLabel}
          onSave={onSave}
          isSaving={isSaving}
        />
      </div>
    </RecordDetailPageShell>
  )
}
