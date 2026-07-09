"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

const CONFIRM_TONE_CLASS_NAME = {
  default:
    "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500/40",
  destructive:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40",
  warning:
    "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500/40",
} as const

export type ConfirmDialogTone = keyof typeof CONFIRM_TONE_CLASS_NAME

export type ConfirmDialogProps = {
  /** Controls visibility. When `false`, the dialog (and its backdrop) is not rendered. */
  open: boolean
  /** Title rendered at the top of the dialog. */
  title: ReactNode
  /** Body content. Plain string for short prompts; ReactNode for richer messages. */
  message: ReactNode
  /** Confirm button label. Default `"Confirm"`. */
  confirmLabel?: string
  /** Cancel button label. Default `"Cancel"`. */
  cancelLabel?: string
  /** Visual tone for the confirm button. `destructive` for delete/void, `warning` for cautionary, `default` otherwise. */
  tone?: ConfirmDialogTone
  /** Fired when the confirm button is clicked. The consumer is responsible for closing the dialog. */
  onConfirm: () => void
  /** Fired when the cancel button, backdrop, or Escape key is activated. */
  onCancel: () => void
}

/**
 * Modal confirmation dialog. Renders a backdrop + centered card with a title,
 * message, and Cancel / Confirm buttons. Used to interrupt the flow on
 * destructive or otherwise-irreversible actions (void, delete, finalize).
 *
 * The dialog is uncontrolled internally — the consumer owns the `open` flag.
 * `onCancel` fires for backdrop click and Escape key in addition to the
 * Cancel button so consumers only need one dismiss handler.
 *
 * Pure UI: no business logic, no toast/notice integration. The consumer
 * triggers the action in `onConfirm` and closes the dialog itself.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  // Auto-focus the confirm button when the dialog opens, and wire Escape to cancel.
  useEffect(() => {
    if (!open) return
    confirmButtonRef.current?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onCancel()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onCancel])

  if (!open || typeof document === "undefined") return null

  // Portal to <body> so the overlay is caged to the engine, not the mount site —
  // a plain inline `fixed inset-0` is trapped by any ancestor that establishes a
  // containing block (transform / filter / stacking context), e.g. a record
  // section. Portaling makes mount location irrelevant (mirrors record-modal.tsx).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/50 transition"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <div id="confirm-dialog-title" className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </div>
        <div className="mt-2 text-sm text-[var(--foreground)]/75">{message}</div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2",
              CONFIRM_TONE_CLASS_NAME[tone],
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
