"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"

export type SidePanelSide = "left" | "right"

export type SidePanelProps = {
  /** Controls visibility. When `false`, the panel and its backdrop are not rendered. */
  open: boolean
  /** Side the panel slides in from. */
  side: SidePanelSide
  /** Fired when the close button, backdrop, or Escape key is activated. */
  onClose: () => void
  /** Optional header label rendered at the top of the panel. */
  title?: ReactNode
  /** Accessible label for the dialog when no visible title is supplied. */
  ariaLabel?: string
  /** Tailwind width class applied to the panel. Default `w-72`. */
  widthClassName?: string
  /** Panel body. */
  children: ReactNode
}

const SIDE_POSITION_CLASS_NAME: Record<SidePanelSide, string> = {
  left: "left-0 border-r",
  right: "right-0 border-l",
}

/**
 * Slide-in side panel. Pure UI overlay: backdrop + edge-anchored card.
 * Consumers own the `open` flag; `onClose` fires for backdrop click,
 * Escape key, and the close button so a single dismiss handler suffices.
 *
 * Composition primitive — does not know about navigation, forms, or any
 * specific feature. Use it for nav drawers, feature panels (template sync,
 * filters), or any other side-anchored overlay.
 */
export function SidePanel({
  open,
  side,
  onClose,
  title,
  ariaLabel,
  widthClassName = "w-72",
  children,
}: SidePanelProps) {
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
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
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
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
