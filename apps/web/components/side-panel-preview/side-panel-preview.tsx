"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"

export type SidePanelPreviewSide = "left" | "right"

export type SidePanelPreviewProps = {
  /** Controls visibility. When `false`, the panel and its backdrop are not rendered. */
  open: boolean
  /** Side the panel slides in from. */
  side: SidePanelPreviewSide
  /** Fired when the close button, backdrop, or Escape key is activated. */
  onClose: () => void
  /** Optional header label rendered at the top of the panel. */
  title?: ReactNode
  /** Accessible label for the dialog when no visible title is supplied. */
  ariaLabel?: string
  /** Tailwind width class applied to the panel. Default `w-72`. */
  widthClassName?: string
  /**
   * Pinned region rendered between the title bar and the scrolling body.
   * Use for content that must always remain visible (e.g. record pickers,
   * the preview header section above paginated child rows).
   */
  stickyHeader?: ReactNode
  /**
   * Pinned region rendered at the bottom of the panel. Use for toolbar
   * controls so they can never overlap or be pushed by body content.
   */
  footer?: ReactNode
  /** Scrolling middle region. */
  children: ReactNode
}

const SIDE_POSITION_CLASS_NAME: Record<SidePanelPreviewSide, string> = {
  left: "left-0 border-r",
  right: "right-0 border-l",
}

/**
 * Slide-in preview panel. Title bar + optional sticky-header slot + scrolling
 * body + optional footer slot, all anchored to one edge. Consumers own the
 * `open` flag; `onClose` fires for backdrop click, Escape, and the close
 * button so a single dismiss handler suffices.
 *
 * Layout discipline: title and sticky-header are flex `shrink-0` and the
 * footer is flex `shrink-0`. The scrolling body is `flex-1 min-h-0
 * overflow-y-auto`. Toolbar controls in the footer can never overlap the
 * scrolling content above them; sticky-header content can never be pushed
 * out of view by a long body.
 *
 * Composition primitive — does not know about navigation, forms, or any
 * specific feature. Use it for record-preview side panels (template sync,
 * future work-order preview, etc.).
 */
export function SidePanelPreview({
  open,
  side,
  onClose,
  title,
  ariaLabel,
  widthClassName = "w-72",
  stickyHeader,
  footer,
  children,
}: SidePanelPreviewProps) {
  useEffect(() => {
    if (!open) return
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
      aria-label={typeof title === "string" ? title : ariaLabel}
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 transition"
      />

      <div
        className={[
          "absolute inset-y-0 flex flex-col",
          "border-[var(--panel-border)] bg-[var(--panel-background)]",
          "shadow-[0_24px_60px_rgba(0,0,0,0.25)]",
          SIDE_POSITION_CLASS_NAME[side],
          widthClassName,
        ].join(" ")}
      >
        {title ? (
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
            <div className="text-sm font-semibold text-[var(--foreground)]">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--foreground)]/65 transition hover:bg-[var(--panel-hover)]"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        {stickyHeader ? (
          <div className="shrink-0 border-b border-[var(--panel-border)] px-4 py-3">
            {stickyHeader}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-[var(--panel-border)] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
