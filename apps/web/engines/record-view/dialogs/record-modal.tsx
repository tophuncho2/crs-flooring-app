"use client"

import { useEffect, useRef, type ReactNode } from "react"

export type RecordModalProps = {
  /** Controls visibility. When `false`, the modal (and its backdrop) is not rendered. */
  open: boolean
  /** Title rendered in the modal header. */
  title: ReactNode
  /** Body content — a form, a picker, whatever the host composes. Scrolls when tall. */
  children: ReactNode
  /** Optional footer slot (e.g. action buttons) pinned beneath the scrollable body. */
  footer?: ReactNode
  /** Fired when the close button, backdrop, or Escape key is activated. */
  onClose: () => void
  /** Max card width. Default `"max-w-2xl"`. */
  widthClassName?: string
}

/**
 * Generic centered-modal shell — a backdrop + centered card with a header
 * (title + close ✕), a scrollable body, and an optional footer. The form-sized
 * sibling of `ConfirmDialog`: where that dialog is a fixed title/message/buttons
 * prompt, this is an open container the host fills with arbitrary content (the
 * shared adjustment create form is the first consumer).
 *
 * The modal is uncontrolled internally — the consumer owns the `open` flag and
 * closes it in `onClose`. `onClose` fires for backdrop click and Escape in
 * addition to the ✕ so consumers need only one dismiss handler.
 */
export function RecordModal({
  open,
  title,
  children,
  footer,
  onClose,
  widthClassName = "max-w-2xl",
}: RecordModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  // Move focus into the card when it opens, and wire Escape to close.
  useEffect(() => {
    if (!open) return
    cardRef.current?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 transition"
      />

      {/* Card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        className={[
          "relative z-10 flex max-h-[90vh] w-full flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-[0_24px_60px_rgba(0,0,0,0.25)] focus-visible:outline-none",
          widthClassName,
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-5 py-3.5">
          <div
            id="record-modal-title"
            className="text-base font-semibold text-[var(--foreground)]"
          >
            {title}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 rounded-md p-1 text-[var(--foreground)]/55 transition hover:bg-[var(--subpanel-background)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div className="border-t border-[var(--panel-border)] px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
