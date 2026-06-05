"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { computePopoverPlacement } from "@/components/dropdowns/positioning/compute-popover-placement"

const POPOVER_CLASS_NAME =
  "flex flex-col rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl focus:outline-none"

const DEFAULT_MAX_HEIGHT_PX = 400
const MIN_POPOVER_WIDTH_PX = 280

export type AnchoredPanelProps = {
  /** Closed-state trigger (a button the consumer toggles via `open`). */
  trigger: ReactNode
  /** Controlled open state. */
  open: boolean
  /** Fired when the panel should close (outside pointer-down or Escape). */
  onClose: () => void
  /** Pinned region at the top of the panel; stays put while the body scrolls. */
  stickyHeader: ReactNode
  /** Scrolling panel body. */
  children: ReactNode
  /** Cap on the panel height before it flips above the trigger. Defaults to 400. */
  maxHeight?: number
}

/**
 * Inline anchored popover. Renders a trigger and, while `open`, portals a panel
 * anchored to the trigger — below it, flipping above when space is tight (via
 * {@link computePopoverPlacement}). The panel is a flex column with a pinned
 * `stickyHeader` and a scrolling body, mirroring `SidePanelPreview` but anchored
 * to a cell rather than a screen edge.
 *
 * Pure chrome: it knows nothing about pickers. Consumers own the trigger button
 * (and its toggle), the header content, and the body content.
 */
export function AnchoredPanel({
  trigger,
  open,
  onClose,
  stickyHeader,
  children,
  maxHeight = DEFAULT_MAX_HEIGHT_PX,
}: AnchoredPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)

  // Measure the trigger on open and keep the panel pinned to it on
  // scroll/resize (capture catches scrolls in any ancestor). A stale rect left
  // behind on close is harmless — the portal only renders while `open`.
  useEffect(() => {
    if (!open) return
    function updateRect() {
      const node = containerRef.current
      if (node) setTriggerRect(node.getBoundingClientRect())
    }
    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [open])

  // Close on a pointer-down outside the trigger and panel.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, onClose])

  // Close on Escape (when the press isn't already handled inside the panel).
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  return (
    <div ref={containerRef} className="relative">
      {trigger}

      {open && triggerRect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              style={{
                position: "fixed",
                ...computePopoverPlacement(triggerRect, { maxHeight }),
                left: triggerRect.left,
                minWidth: Math.max(triggerRect.width, MIN_POPOVER_WIDTH_PX),
                maxWidth: `min(32rem, calc(100vw - ${Math.max(triggerRect.left, 0) + 8}px))`,
                zIndex: 1000,
              }}
              className={POPOVER_CLASS_NAME}
            >
              <div className="shrink-0 border-b border-[var(--panel-border)] p-2">
                {stickyHeader}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
