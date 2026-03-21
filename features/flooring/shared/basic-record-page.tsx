"use client"

import type { ReactNode } from "react"
import { FormStatusNotices } from "./notices"
import { RecordPanelFooter } from "./record-panel-footer"
import { RecordDetailPageShell } from "./record-detail-page-shell"

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
  sizeClass = "max-w-6xl",
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
