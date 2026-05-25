"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import type { ActionsPanelAction } from "./contracts/actions-panel-action"

const TRIGGER_BASE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:ring-1 focus-visible:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
const TRIGGER_PRIMARY_CLASS_NAME =
  "border border-sky-600 bg-sky-600 text-white hover:border-sky-500 hover:bg-sky-500"
const TRIGGER_SECONDARY_CLASS_NAME =
  "border border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)] hover:bg-[var(--panel-border)]/15"
const TRIGGER_GHOST_CLASS_NAME =
  "text-[var(--foreground)]/80 hover:bg-[var(--panel-border)]/15 hover:text-[var(--foreground)]"

const PANEL_CLASS_NAME =
  "flex flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-2xl focus:outline-none"

const ROW_BASE_CLASS_NAME =
  "flex w-full items-start gap-3 px-4 py-2.5 text-left outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
const ROW_NEUTRAL_ACTIVE_CLASS_NAME = "bg-sky-500/10"
const ROW_NEUTRAL_HOVER_CLASS_NAME = "hover:bg-[var(--panel-border)]/15"
const ROW_DESTRUCTIVE_ACTIVE_CLASS_NAME = "bg-rose-500/10"
const ROW_DESTRUCTIVE_HOVER_CLASS_NAME = "hover:bg-rose-500/10"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ActionsPanelProps = {
  triggerLabel: string
  triggerKind?: "primary" | "secondary" | "ghost"
  triggerIcon?: ReactNode
  /** Trailing chevron on the trigger. Default: true. */
  showChevron?: boolean
  /** Optional small heading rendered at the top of the panel. */
  panelTitle?: string
  actions: ReadonlyArray<ActionsPanelAction>
  /** Disables the trigger entirely. */
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

/**
 * Right-anchored multi-action panel. Designed for "do something with the
 * current selection" affordances on a grid header — replaces a wall of inline
 * buttons with a single trigger that opens a vertical panel of actions.
 *
 * Behaviour:
 *   - Anchored by the trigger's RIGHT edge: the panel grows leftward and
 *     downward, so it never clips the right edge of the viewport.
 *   - Each action is a row with a label, optional description, optional icon.
 *   - Destructive actions use rose-tinted colours and a sharper hover.
 *   - Keyboard: ↑ / ↓ navigate, Enter / Space activates, Esc closes.
 *   - Click outside or pressing Esc closes the panel.
 *   - Adjacent actions sharing a `group` key cluster; a divider separates
 *     groups for visual rhythm.
 */
export function ActionsPanel({
  triggerLabel,
  triggerKind = "secondary",
  triggerIcon,
  showChevron = true,
  panelTitle,
  actions,
  disabled = false,
  ariaLabel,
  className,
}: ActionsPanelProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Group consecutive actions that share a `group` key. Order preserved.
  const grouped = useMemo(() => {
    const groups: Array<{ key: string; items: ActionsPanelAction[] }> = []
    actions.forEach((action, index) => {
      const groupKey = action.group ?? `__solo-${index}`
      const last = groups[groups.length - 1]
      if (last && last.key === groupKey) {
        last.items.push(action)
      } else {
        groups.push({ key: groupKey, items: [action] })
      }
    })
    return groups
  }, [actions])

  // Flat enabled-action list drives keyboard navigation (skips disabled).
  const navigableIndices = useMemo(() => {
    const indices: number[] = []
    actions.forEach((action, index) => {
      if (!action.disabled) indices.push(index)
    })
    return indices
  }, [actions])

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
    const trigger = containerRef.current?.querySelector<HTMLButtonElement>(
      "button[data-actions-panel-trigger]",
    )
    trigger?.focus()
  }, [])

  const commit = useCallback(
    (action: ActionsPanelAction) => {
      if (action.disabled) return
      action.onClick()
      closeAndReturnFocus()
    },
    [closeAndReturnFocus],
  )

  // Click-outside close.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
      setActiveIndex(-1)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // Track trigger geometry for portal anchoring.
  useEffect(() => {
    if (!open) return
    function updateRect() {
      const trigger = containerRef.current?.querySelector<HTMLButtonElement>(
        "button[data-actions-panel-trigger]",
      )
      if (trigger) setTriggerRect(trigger.getBoundingClientRect())
    }
    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [open])

  // Pre-select the first navigable action when the panel opens or the action
  // set changes — derived during render (keyed on content so an unstable
  // `actions` prop can't loop it).
  const navigableKey = navigableIndices.join(",")
  const [activeReset, setActiveReset] = useState({ open, navigableKey })
  if (activeReset.open !== open || activeReset.navigableKey !== navigableKey) {
    setActiveReset({ open, navigableKey })
    if (open) setActiveIndex(navigableIndices[0] ?? -1)
  }

  // Focus the panel for keyboard handling on open.
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
  }, [open])

  // Scroll the active row into view as the user navigates.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = panelRef.current?.querySelector<HTMLElement>(
      `[data-action-index="${activeIndex}"]`,
    )
    node?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

  const moveActive = useCallback(
    (delta: number) => {
      if (navigableIndices.length === 0) return
      const currentPos = navigableIndices.indexOf(activeIndex)
      const nextPos =
        currentPos < 0
          ? delta > 0
            ? 0
            : navigableIndices.length - 1
          : (currentPos + delta + navigableIndices.length) % navigableIndices.length
      setActiveIndex(navigableIndices[nextPos])
    },
    [activeIndex, navigableIndices],
  )

  const handlePanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault()
          closeAndReturnFocus()
          return
        case "ArrowDown":
          event.preventDefault()
          moveActive(1)
          return
        case "ArrowUp":
          event.preventDefault()
          moveActive(-1)
          return
        case "Home":
          event.preventDefault()
          if (navigableIndices.length > 0) setActiveIndex(navigableIndices[0])
          return
        case "End":
          event.preventDefault()
          if (navigableIndices.length > 0) setActiveIndex(navigableIndices[navigableIndices.length - 1])
          return
        case "Enter":
        case " ":
          event.preventDefault()
          if (activeIndex >= 0) {
            const action = actions[activeIndex]
            if (action) commit(action)
          }
          return
      }
    },
    [actions, activeIndex, commit, closeAndReturnFocus, moveActive, navigableIndices],
  )

  const triggerKindClass =
    triggerKind === "primary"
      ? TRIGGER_PRIMARY_CLASS_NAME
      : triggerKind === "ghost"
        ? TRIGGER_GHOST_CLASS_NAME
        : TRIGGER_SECONDARY_CLASS_NAME

  return (
    <div ref={containerRef} className={joinClassNames("relative inline-block", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-actions-panel-trigger
        disabled={disabled}
        onClick={() => !disabled && setOpen((previous) => !previous)}
        className={joinClassNames(TRIGGER_BASE_CLASS_NAME, triggerKindClass)}
      >
        {triggerIcon ? <span aria-hidden="true">{triggerIcon}</span> : null}
        <span>{triggerLabel}</span>
        {showChevron ? (
          <span
            aria-hidden="true"
            className="ml-0.5 text-[0.7rem] opacity-70"
            style={{
              display: "inline-block",
              transition: "transform 120ms ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        ) : null}
      </button>

      {open && triggerRect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="menu"
              tabIndex={-1}
              onKeyDown={handlePanelKeyDown}
              style={{
                position: "fixed",
                top: triggerRect.bottom + 6,
                // Anchor by RIGHT edge — panel expands leftward + downward.
                right: Math.max(window.innerWidth - triggerRect.right, 8),
                minWidth: Math.max(triggerRect.width, 280),
                maxWidth: `min(420px, calc(100vw - 16px))`,
                zIndex: 1000,
              }}
              className={PANEL_CLASS_NAME}
            >
              {panelTitle ? (
                <div className="border-b border-[var(--panel-border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]/55">
                  {panelTitle}
                </div>
              ) : null}

              <div className="flex flex-col py-1.5">
                {grouped.map((group, groupIndex) => (
                  <div key={group.key} className="flex flex-col">
                    {groupIndex > 0 ? (
                      <div className="my-1.5 border-t border-[var(--panel-border)]/55" />
                    ) : null}
                    {group.items.map((action) => {
                      const flatIndex = actions.indexOf(action)
                      const isActive = flatIndex === activeIndex
                      const destructive = Boolean(action.destructive)
                      const labelToneClass = destructive
                        ? "text-rose-700"
                        : "text-[var(--foreground)]"
                      const descriptionToneClass = destructive
                        ? "text-rose-700/70"
                        : "text-[var(--foreground)]/60"
                      const iconToneClass = destructive
                        ? "text-rose-600/80"
                        : "text-[var(--foreground)]/55"
                      const activeClass = destructive
                        ? ROW_DESTRUCTIVE_ACTIVE_CLASS_NAME
                        : ROW_NEUTRAL_ACTIVE_CLASS_NAME
                      const hoverClass = destructive
                        ? ROW_DESTRUCTIVE_HOVER_CLASS_NAME
                        : ROW_NEUTRAL_HOVER_CLASS_NAME
                      return (
                        <button
                          key={action.key}
                          type="button"
                          role="menuitem"
                          data-action-index={flatIndex}
                          disabled={action.disabled}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => commit(action)}
                          className={joinClassNames(
                            ROW_BASE_CLASS_NAME,
                            isActive ? activeClass : hoverClass,
                          )}
                        >
                          {action.icon ? (
                            <span
                              aria-hidden="true"
                              className={joinClassNames("mt-0.5 shrink-0", iconToneClass)}
                            >
                              {action.icon}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span
                              className={joinClassNames(
                                "block text-sm font-medium leading-tight",
                                labelToneClass,
                              )}
                            >
                              {action.label}
                            </span>
                            {action.description ? (
                              <span
                                className={joinClassNames(
                                  "mt-0.5 block text-xs leading-snug",
                                  descriptionToneClass,
                                )}
                              >
                                {action.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
