"use client"

import type { FlooringInventoryAdjustmentStatus } from "@builders/domain"
import { ConfirmDialog } from "./confirm-dialog"

export type AdjustmentActionDialogProps = {
  open: boolean
  /** Status of the adjustment the action targets — drives the dialog copy. */
  status: FlooringInventoryAdjustmentStatus
  /** Adjustment number (the user-visible "ADJ-N" identifier). */
  adjustmentNumber: string
  /** Fired when the user confirms. The consumer is responsible for closing. */
  onConfirm: () => void
  /** Fired when the user cancels (button, backdrop, Escape). */
  onCancel: () => void
  /** Optional pending flag — when true, the dialog renders the confirm label as in-flight copy. */
  pending?: boolean
}

type DialogCopy = {
  title: string
  message: string
  confirmLabel: string
  pendingLabel: string
}

const PENDING_COPY: DialogCopy = {
  title: "Delete adjustment?",
  message:
    "This pending adjustment will be removed. Adjustments that have been finalized cannot be deleted — they can only be voided.",
  confirmLabel: "Delete",
  pendingLabel: "Deleting…",
}

const FINAL_COPY: DialogCopy = {
  title: "Void adjustment?",
  message:
    "Voiding marks this finalized adjustment as no longer counted; the row stays in the history with its original sequence number.",
  confirmLabel: "Void",
  pendingLabel: "Voiding…",
}

/**
 * Status-aware destructive-action dialog for adjustments. The consumer opens it
 * by clicking the row's destructive action button; the dialog shows the
 * right copy depending on whether the row is PENDING (delete) or FINAL
 * (void). The button is expected to be disabled in the row when the status
 * is VOID or QUEUED, so this dialog never needs to render copy for those.
 *
 * Pure UI wrapper over `ConfirmDialog`. The consumer is responsible for
 * dispatching the actual mutation in `onConfirm` and toggling `open`.
 */
export function AdjustmentActionDialog({
  open,
  status,
  adjustmentNumber,
  onConfirm,
  onCancel,
  pending = false,
}: AdjustmentActionDialogProps) {
  const copy = status === "FINAL" ? FINAL_COPY : PENDING_COPY
  return (
    <ConfirmDialog
      open={open}
      title={copy.title}
      message={
        <span>
          <span className="font-mono text-xs text-[var(--foreground)]/85">{adjustmentNumber}</span>
          <span className="ml-1">— {copy.message}</span>
        </span>
      }
      confirmLabel={pending ? copy.pendingLabel : copy.confirmLabel}
      cancelLabel="Cancel"
      tone="destructive"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
