"use client"

import type { ReactNode } from "react"
import { ConfirmDialog } from "./confirm-dialog"

export type RecordDeleteDialogProps = {
  /** Controls visibility — drive from `useRecordDeleteConfirmation().isOpen`. */
  open: boolean
  /** When true, the confirm button reads "Deleting…" and the caller should block re-entry. */
  isDeleting: boolean
  /** Dialog title, e.g. "Delete property?". */
  title: ReactNode
  /** Body copy describing the consequences of the delete. */
  message: ReactNode
  /** Fired when the confirm button is clicked — wire to `confirmDelete`. */
  onConfirm: () => void
  /** Fired on cancel/backdrop/Escape — wire to `cancelDelete`. */
  onCancel: () => void
}

/**
 * Destructive confirmation preset for record deletes: a thin `ConfirmDialog`
 * fixed to the delete tone/labels that swaps the confirm label to "Deleting…"
 * while the delete is in flight. Pairs with `useRecordDeleteConfirmation`,
 * which owns the open/in-flight state.
 */
export function RecordDeleteDialog({
  open,
  isDeleting,
  title,
  message,
  onConfirm,
  onCancel,
}: RecordDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      message={message}
      confirmLabel={isDeleting ? "Deleting…" : "Delete"}
      cancelLabel="Cancel"
      tone="destructive"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
