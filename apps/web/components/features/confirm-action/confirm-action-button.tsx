"use client"

import { useCallback, useState, type ReactNode } from "react"
import {
  RowActionButton,
  type RowActionButtonTone,
} from "@/components/cells/row-action-button"
import {
  ConfirmDialog,
  type ConfirmDialogTone,
} from "@/components/dialogs/confirm-dialog"

export type ConfirmActionButtonProps = {
  /** Button label (text, icon, or both). */
  label: ReactNode
  /** Required for accessibility — describes the row + action ("Void cut #3"). */
  ariaLabel: string
  /** Visual tone of the trigger button. Defaults to `neutral`. */
  buttonTone?: RowActionButtonTone
  /** Disables the trigger button (and prevents the dialog from opening). */
  editable?: boolean
  /** Optional `title` attribute on the trigger. */
  title?: string
  className?: string

  /** Dialog title. */
  confirmTitle: ReactNode
  /** Dialog body. */
  confirmMessage: ReactNode
  /** Dialog confirm button label. Defaults to `"Confirm"`. */
  confirmLabel?: string
  /** Label shown on the confirm button while `onConfirm` is in flight. Defaults to `"Working…"`. */
  pendingLabel?: string
  /** Dialog cancel button label. Defaults to `"Cancel"`. */
  cancelLabel?: string
  /** Visual tone for the dialog confirm button. Defaults to the button's tone (or `default`). */
  confirmTone?: ConfirmDialogTone

  /**
   * Action fired when the user confirms. May be sync or async — when async,
   * the dialog stays open and the confirm button shows `pendingLabel` until
   * the promise resolves; the dialog closes on resolve. If the promise
   * rejects, the dialog stays open so the consumer can surface the error
   * elsewhere; the confirm button returns to its idle label.
   */
  onConfirm: () => void | Promise<void>
}

/**
 * Generic "destructive button + confirm dialog" primitive. Composes
 * `RowActionButton` (the trigger) and `ConfirmDialog` (the modal) with
 * internal `open` + `isFiring` state so consumers don't have to manage
 * dialog lifecycle.
 *
 * Use for any per-row destructive action that needs a confirm step (Void,
 * Delete, etc.). Sits inside a Grid trailing-control column the same way
 * `RowActionButton` does — the trigger occupies the cell and the dialog
 * portal-renders centered on screen.
 */
export function ConfirmActionButton({
  label,
  ariaLabel,
  buttonTone = "neutral",
  editable = true,
  title,
  className,
  confirmTitle,
  confirmMessage,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  cancelLabel = "Cancel",
  confirmTone,
  onConfirm,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false)
  const [isFiring, setIsFiring] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsFiring(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // Leave dialog open so the consumer can surface the error and the
      // user can retry or cancel. `isFiring` resets in the finally block.
    } finally {
      setIsFiring(false)
    }
  }, [onConfirm])

  const handleCancel = useCallback(() => {
    if (isFiring) return
    setOpen(false)
  }, [isFiring])

  // Default the dialog confirm button tone to the trigger tone when the
  // consumer hasn't specified one, so a destructive trigger gets a
  // destructive confirm button by default.
  const resolvedConfirmTone: ConfirmDialogTone =
    confirmTone ??
    (buttonTone === "destructive"
      ? "destructive"
      : buttonTone === "warning"
        ? "warning"
        : "default")

  return (
    <>
      <RowActionButton
        label={label}
        ariaLabel={ariaLabel}
        tone={buttonTone}
        title={title}
        className={className}
        editable={editable}
        onClick={() => setOpen(true)}
      />
      <ConfirmDialog
        open={open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={isFiring ? pendingLabel : confirmLabel}
        cancelLabel={cancelLabel}
        tone={resolvedConfirmTone}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}
