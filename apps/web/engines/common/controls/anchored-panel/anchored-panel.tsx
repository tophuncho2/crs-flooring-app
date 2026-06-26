"use client"

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { computePopoverPlacement } from "../positioning/compute-popover-placement"

// One entry per open panel, in open order. A panel portals its popover to
// document.body, so a *nested* panel (e.g. a picker opened inside a toolbar
// menu) lands in a sibling DOM subtree the outer panel's `popoverRef` can't
// contain. Without this registry the outer panel reads a click inside the inner
// panel as an outside click and closes mid-selection. Each panel ignores
// pointer-downs that land inside any panel opened *after* it (its descendants).
type AnchoredPanelEntry = {
  containerRef: RefObject<HTMLDivElement | null>
  popoverRef: RefObject<HTMLDivElement | null>
}
const openPanelStack: AnchoredPanelEntry[] = []

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
  /**
   * Which edge of the panel pins to the trigger. `"left"` (default) anchors the
   * left edge and expands right — correct for left-clustered cell pickers.
   * `"right"` anchors the right edge and expands left — correct for the
   * right-clustered toolbar tools, which otherwise run off the viewport.
   */
  align?: "left" | "right"
}

/**
 * Inline anchored popover. Renders a trigger and, while `open`, portals a panel
 * anchored to the trigger — below it, flipping above when space is tight (via
 * {@link computePopoverPlacement}). The panel is a flex column with a pinned
 * `stickyHeader` and a scrolling body, anchored to a cell rather than a screen
 * edge.
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
  align = "left",
}: AnchoredPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const entryRef = useRef<AnchoredPanelEntry>({ containerRef, popoverRef })
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

  // Close on a pointer-down outside the trigger and panel — but never when the
  // click lands inside a panel opened after this one (a nested descendant that
  // portals into a sibling DOM subtree this panel can't `contains()`).
  useEffect(() => {
    if (!open) return
    const entry = entryRef.current
    openPanelStack.push(entry)
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      const myIndex = openPanelStack.indexOf(entry)
      for (let i = myIndex + 1; i < openPanelStack.length; i += 1) {
        const deeper = openPanelStack[i]
        if (
          deeper.containerRef.current?.contains(target) ||
          deeper.popoverRef.current?.contains(target)
        ) {
          return
        }
      }
      onClose()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      const idx = openPanelStack.indexOf(entry)
      if (idx >= 0) openPanelStack.splice(idx, 1)
    }
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
                ...(align === "right"
                  ? {
                      right: window.innerWidth - triggerRect.right,
                      maxWidth: `min(32rem, calc(${Math.max(triggerRect.right - 8, 0)}px))`,
                    }
                  : {
                      left: triggerRect.left,
                      maxWidth: `min(32rem, calc(100vw - ${Math.max(triggerRect.left, 0) + 8}px))`,
                    }),
                minWidth: Math.max(triggerRect.width, MIN_POPOVER_WIDTH_PX),
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
