"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
} from "./record-action-buttons"

/**
 * Carded record-view footer holding a destructive delete (guarded by a
 * confirm dialog) and a neutral close. The same setup the work-orders record
 * view uses — rendered as a sibling beneath the section panel. `onDelete` is
 * optional; omit it for views with nothing to delete.
 */
export function RecordEntityFooter({
  onClose,
  onDelete,
  deleteLabel = "Delete",
  closeLabel = "Close",
  confirmTitle = "Delete record?",
  confirmMessage = "This cannot be undone.",
}: {
  onClose: () => void
  onDelete?: () => Promise<unknown>
  deleteLabel?: string
  closeLabel?: string
  confirmTitle?: string
  confirmMessage?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  async function confirm() {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      await onDelete?.()
    } finally {
      setIsConfirming(false)
      setIsOpen(false)
    }
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-4 py-3">
        <div className="flex gap-2">
          {onDelete ? (
            <RecordFooterDestructiveButton
              onClick={() => {
                if (!isConfirming) setIsOpen(true)
              }}
              disabled={isConfirming}
            >
              {deleteLabel}
            </RecordFooterDestructiveButton>
          ) : null}
        </div>
        <div className="flex gap-2">
          <RecordFooterNeutralButton onClick={onClose} disabled={isConfirming}>
            {closeLabel}
          </RecordFooterNeutralButton>
        </div>
      </div>
      <ConfirmDialog
        open={isOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={isConfirming ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={() => void confirm()}
        onCancel={() => {
          if (!isConfirming) setIsOpen(false)
        }}
      />
    </>
  )
}
