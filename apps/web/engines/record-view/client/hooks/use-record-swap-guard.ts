"use client"

import { useCallback, useState } from "react"
import type { ConfirmDialogProps } from "../../dialogs/confirm-dialog"

const DEFAULT_DISCARD_MESSAGE =
  "This record has unsaved changes. Switching will discard them."

export type RecordSwapGuard = {
  /**
   * Defer `action` behind the discard prompt when the record is dirty; run it
   * immediately when clean.
   */
  guard: (action: () => void) => void
  /** Spread onto a single `<ConfirmDialog />` the consumer mounts. */
  dialogProps: ConfirmDialogProps
}

/**
 * The canonical in-place record-swap guard. An in-place swap — selecting a
 * different record in the reference header, or stepping ◀/▶ in the shell stepper
 * — is NOT a router navigation, so it can't lean on the scaffold's route-leave
 * dialog (`page.dirtyLeaveDialogProps`); it needs its own confirm. Both consumers
 * share this hook so the swap-discard contract lives in exactly one place.
 */
export function useRecordSwapGuard({
  isDirty,
  discardMessage = DEFAULT_DISCARD_MESSAGE,
  title = "Discard unsaved changes?",
  confirmLabel = "Discard",
  cancelLabel = "Keep editing",
}: {
  isDirty: boolean
  discardMessage?: string
  /**
   * Override the dialog copy when the swap does NOT discard. The default copy
   * suits a discarding swap (reference-header re-pick, shell stepper); a swap
   * that keeps edits (e.g. the WO materials view flip) passes switch-flavored
   * copy so the confirm button doesn't read "Discard".
   */
  title?: string
  confirmLabel?: string
  cancelLabel?: string
}): RecordSwapGuard {
  const [pendingAction, setPendingAction] = useState<{ run: () => void } | null>(null)

  const guard = useCallback(
    (action: () => void) => {
      if (isDirty) setPendingAction({ run: action })
      else action()
    },
    [isDirty],
  )

  const dialogProps: ConfirmDialogProps = {
    open: pendingAction !== null,
    title,
    message: discardMessage,
    confirmLabel,
    cancelLabel,
    tone: "warning",
    onConfirm: () => {
      pendingAction?.run()
      setPendingAction(null)
    },
    onCancel: () => setPendingAction(null),
  }

  return { guard, dialogProps }
}
