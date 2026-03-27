"use client"

import type { ReactNode } from "react"
import { confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
  RecordFooterPrimaryButton,
} from "@/features/flooring/shared/ui/record-page/record-action-buttons"

export { confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"

export function RecordPanelFooter({
  deleteLabel,
  deleteConfirmMessage,
  onDelete,
  closeLabel = "Close",
  onClose,
  saveLabel,
  savingLabel,
  onSave,
  isSaving = false,
  leftExtra,
}: {
  deleteLabel?: string
  deleteConfirmMessage?: string
  onDelete?: () => void
  closeLabel?: string
  onClose: () => void
  saveLabel: string
  savingLabel: string
  onSave: () => void
  isSaving?: boolean
  leftExtra?: ReactNode
}) {
  function handleDelete() {
    if (!onDelete || !deleteConfirmMessage) {
      return
    }

    if (!confirmRecordDelete(deleteConfirmMessage)) {
      return
    }

    onDelete()
  }

  return (
    <div className="flex justify-between gap-2">
      <div className="flex gap-2">
        {leftExtra}
        {onDelete && deleteLabel ? (
          <RecordFooterDestructiveButton onClick={handleDelete} disabled={isSaving}>
            {deleteLabel}
          </RecordFooterDestructiveButton>
        ) : null}
      </div>
      <div className="flex gap-2">
        <RecordFooterNeutralButton onClick={onClose} disabled={isSaving}>
          {closeLabel}
        </RecordFooterNeutralButton>
        <RecordFooterPrimaryButton onClick={onSave} disabled={isSaving}>
          {isSaving ? savingLabel : saveLabel}
        </RecordFooterPrimaryButton>
      </div>
    </div>
  )
}
