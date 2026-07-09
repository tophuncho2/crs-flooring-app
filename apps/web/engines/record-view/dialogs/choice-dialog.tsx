"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

export type ChoiceDialogProps = {
  /** Controls visibility. When `false`, the dialog (and its backdrop) is not rendered. */
  open: boolean
  /** Title rendered at the top of the dialog. */
  title: ReactNode
  /** Body content. Plain string for short prompts; ReactNode for richer messages. */
  message: ReactNode
  /** Primary (recommended) choice — the focused, emphasized button. */
  primaryLabel: string
  onPrimary: () => void
  /** Secondary choice — the neutral button. */
  secondaryLabel: string
  onSecondary: () => void
  /**
   * Optional dismiss. When provided, the backdrop and Escape key dismiss the
   * dialog (and a "Cancel" affordance becomes meaningful). Omit it to force a
   * choice — e.g. after both records were created, there is no "neither".
   */
  onCancel?: () => void
}

/**
 * Modal two-choice dialog. Renders a backdrop + centered card with a title,
 * message, and two action buttons (a primary/recommended and a secondary). Used
 * to branch navigation when an action produced more than one sensible
 * destination — e.g. the management form creating both a entity and
 * a property: "Go to property" vs "Go to entity".
 *
 * Pure UI: no business logic. The consumer owns the `open` flag and performs the
 * navigation in `onPrimary` / `onSecondary`. When `onCancel` is omitted the
 * dialog cannot be dismissed without choosing.
 */
export function ChoiceDialog({
  open,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onCancel,
}: ChoiceDialogProps) {
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    primaryButtonRef.current?.focus()
    if (!onCancel) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onCancel?.()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onCancel])

  if (!open || typeof document === "undefined") return null

  // Portal to <body> so the overlay is caged to the engine, not the mount site —
  // a plain inline `fixed inset-0` is trapped by any ancestor that establishes a
  // containing block (transform / filter / stacking context). Portaling makes
  // mount location irrelevant (mirrors record-modal.tsx).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="choice-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop — inert unless the dialog is dismissable. */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onCancel}
        disabled={!onCancel}
        className="absolute inset-0 cursor-default bg-black/50 transition disabled:cursor-default"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <div id="choice-dialog-title" className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </div>
        <div className="mt-2 text-sm text-[var(--foreground)]/75">{message}</div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            {secondaryLabel}
          </button>
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={onPrimary}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
