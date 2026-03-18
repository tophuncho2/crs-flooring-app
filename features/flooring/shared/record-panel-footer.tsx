"use client"

import type { ReactNode } from "react"

export function confirmRecordDelete(message: string) {
  if (typeof window === "undefined") {
    return false
  }

  return window.confirm(message)
}

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
  deleteLabel: string
  deleteConfirmMessage: string
  onDelete: () => void
  closeLabel?: string
  onClose: () => void
  saveLabel: string
  savingLabel: string
  onSave: () => void
  isSaving?: boolean
  leftExtra?: ReactNode
}) {
  function handleDelete() {
    if (!confirmRecordDelete(deleteConfirmMessage)) {
      return
    }

    onDelete()
  }

  return (
    <div className="flex justify-between gap-2">
      <div className="flex gap-2">
        {leftExtra}
        <button type="button" onClick={handleDelete} className="rounded border border-rose-500/40 px-4 py-2 text-sm text-rose-500 hover:bg-rose-500/10">
          {deleteLabel}
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
          {closeLabel}
        </button>
        <button type="button" onClick={onSave} disabled={isSaving} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
          {isSaving ? savingLabel : saveLabel}
        </button>
      </div>
    </div>
  )
}
