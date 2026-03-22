"use client"

import type { ReactNode } from "react"
import { RecordModalShell } from "@/features/flooring/shared/ui/forms/record-form"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"

export function BasicRecordPanel({
  title,
  onClose,
  children,
  message,
  error,
  loadingMessage,
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
  loadingMessage?: string
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
        <FormStatusNotices message={message} error={error} loadingMessage={loadingMessage} />
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
