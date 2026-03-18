"use client"

import type { ReactNode } from "react"
import { RecordModalShell } from "./record-form"
import { ErrorNotice, SuccessNotice } from "./notices"
import { RecordPanelFooter } from "./record-panel-footer"

export function BasicRecordPanel({
  title,
  onClose,
  children,
  message,
  error,
  headerActions,
  saveLabel,
  savingLabel,
  deleteLabel,
  deleteConfirmMessage,
  onSave,
  onDelete,
  isSaving = false,
  sizeClass = "max-w-5xl",
}: {
  title: string
  onClose: () => void
  children: ReactNode
  message?: string
  error?: string
  headerActions?: ReactNode
  saveLabel: string
  savingLabel: string
  deleteLabel: string
  deleteConfirmMessage: string
  onSave: () => void
  onDelete: () => void
  isSaving?: boolean
  sizeClass?: string
}) {
  return (
    <RecordModalShell title={title} onClose={onClose} headerActions={headerActions} sizeClass={sizeClass}>
      <div className="space-y-6">
        {message ? <SuccessNotice>{message}</SuccessNotice> : null}
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        {children}
        <RecordPanelFooter
          deleteLabel={deleteLabel}
          deleteConfirmMessage={deleteConfirmMessage}
          onDelete={onDelete}
          onClose={onClose}
          saveLabel={saveLabel}
          savingLabel={savingLabel}
          onSave={onSave}
          isSaving={isSaving}
        />
      </div>
    </RecordModalShell>
  )
}
