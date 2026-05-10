"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { RichDropdownOption } from "./contracts/rich-dropdown-option"

const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
const TRIGGER_INVALID_CLASS_NAME =
  "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/40"

const POPOVER_CLASS_NAME =
  "flex flex-col rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl focus:outline-none"

const SEARCH_INPUT_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

const VIEWPORT_MARGIN_PX = 8
const POPOVER_GAP_PX = 6
const POPOVER_MAX_HEIGHT_PX = 320

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

// Decide whether the popover renders below or above the trigger. Flips up when
// there isn't room below for the full max-height AND there's more room above.
// Caps `maxHeight` to whatever space is available so the popover never extends
// past the viewport on either side.
function computePopoverPlacement(triggerRect: DOMRect): React.CSSProperties {
  const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_MARGIN_PX
  const spaceAbove = triggerRect.top - VIEWPORT_MARGIN_PX
  const openUp =
    spaceBelow < POPOVER_MAX_HEIGHT_PX + POPOVER_GAP_PX && spaceAbove > spaceBelow
  if (openUp) {
    return {
      bottom: window.innerHeight - triggerRect.top + POPOVER_GAP_PX,
      maxHeight: Math.max(0, Math.min(POPOVER_MAX_HEIGHT_PX, spaceAbove - POPOVER_GAP_PX)),
    }
  }
  return {
    top: triggerRect.bottom + POPOVER_GAP_PX,
    maxHeight: Math.max(0, Math.min(POPOVER_MAX_HEIGHT_PX, spaceBelow - POPOVER_GAP_PX)),
  }
}

export type RichDropdownProps = {
  value: string | null
  onChange: (value: string | null) => void
  options: ReadonlyArray<RichDropdownOption>
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
}

/**
 * Standalone keyboard-accessible dropdown with an in-popover search bar, a
 * deselect affordance, and rich title + subtitle rows. Each option shows a
 * primary `title` line and an optional secondary line composed of joined
 * `subtitles` in a smaller, muted font. Search filters against title and every
 * subtitle.
 */
export function RichDropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches",
  clearLabel = "Clear selection",
  disabled = false,
  invalid = false,
  ariaLabel,
  className,
}: RichDropdownProps) {
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return options
    return options.filter((option) => {
      if (option.title.toLowerCase().includes(trimmed)) return true
      if (option.subtitles?.some((subtitle) => subtitle.toLowerCase().includes(trimmed))) return true
      return false
    })
  }, [options, query])

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
    setQuery("")
    const trigger = containerRef.current?.querySelector<HTMLButtonElement>(
      "button[data-rich-dropdown-trigger]",
    )
    trigger?.focus()
  }, [])

  const commitSelection = useCallback(
    (optionId: string) => {
      onChange(optionId)
      closeAndReturnFocus()
    },
    [onChange, closeAndReturnFocus],
  )

  const commitClear = useCallback(() => {
    onChange(null)
    closeAndReturnFocus()
  }, [onChange, closeAndReturnFocus])

  // Click outside closes the popover.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
      setActiveIndex(-1)
      setQuery("")
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // Track trigger geometry so the portal-rendered popover stays anchored.
  useEffect(() => {
    if (!open) return
    function updateRect() {
      const trigger = containerRef.current?.querySelector<HTMLButtonElement>(
        "button[data-rich-dropdown-trigger]",
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

  // Reset active index when the filtered list changes; preserve the currently
  // selected option's position when present.
  useEffect(() => {
    if (!open) return
    if (filteredOptions.length === 0) {
      setActiveIndex(-1)
      return
    }
    const currentIndex = filteredOptions.findIndex((option) => option.id === value)
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [open, filteredOptions, value])

  // Keep the active option in view as the user navigates with arrow keys.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = popoverRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    )
    node?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

  // Focus the search input as soon as the popover opens. Depends on
  // `triggerRect` so the effect re-runs once the popover (gated on
  // `open && triggerRect`) actually mounts on first open.
  useEffect(() => {
    if (!open || !triggerRect) return
    searchInputRef.current?.focus()
  }, [open, triggerRect])

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        setOpen(true)
      }
    },
    [disabled],
  )

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault()
          closeAndReturnFocus()
          return
        case "ArrowDown":
          if (filteredOptions.length === 0) return
          event.preventDefault()
          setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
          return
        case "ArrowUp":
          if (filteredOptions.length === 0) return
          event.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
          return
        case "Home":
          if (filteredOptions.length === 0) return
          event.preventDefault()
          setActiveIndex(0)
          return
        case "End":
          if (filteredOptions.length === 0) return
          event.preventDefault()
          setActiveIndex(filteredOptions.length - 1)
          return
        case "Enter":
          event.preventDefault()
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            const option = filteredOptions[activeIndex]
            if (!option.disabled) commitSelection(option.id)
          }
          return
      }
    },
    [filteredOptions, activeIndex, commitSelection, closeAndReturnFocus],
  )

  const triggerLabel = selected ? selected.title : placeholder

  return (
    <div ref={containerRef} className={joinClassNames("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        data-rich-dropdown-trigger
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={joinClassNames(
          TRIGGER_BASE_CLASS_NAME,
          invalid ? TRIGGER_INVALID_CLASS_NAME : undefined,
        )}
      >
        <span
          className={joinClassNames(
            "min-w-0 truncate",
            !selected ? "text-[var(--foreground)]/60" : undefined,
          )}
        >
          {triggerLabel}
        </span>
        <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
          ▾
        </span>
      </button>

      {open && triggerRect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              style={{
                position: "fixed",
                ...computePopoverPlacement(triggerRect),
                left: triggerRect.left,
                minWidth: triggerRect.width,
                maxWidth: `min(32rem, calc(100vw - ${Math.max(triggerRect.left, 0) + 8}px))`,
                zIndex: 1000,
              }}
              className={POPOVER_CLASS_NAME}
            >
              <div className="border-b border-[var(--panel-border)] p-2">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  aria-controls={listboxId}
                  aria-activedescendant={
                    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
                  }
                  className={SEARCH_INPUT_CLASS_NAME}
                />
              </div>

              {selected ? (
                <button
                  type="button"
                  onClick={commitClear}
                  className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/15 hover:text-[var(--foreground)]"
                >
                  <span aria-hidden="true">✕</span>
                  <span>{clearLabel}</span>
                </button>
              ) : null}

              <div
                id={listboxId}
                role="listbox"
                tabIndex={-1}
                aria-activedescendant={
                  activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
                }
                className="min-h-0 flex-1 overflow-y-auto py-1"
              >
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-[var(--foreground)]/55">
                    {emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isActive = index === activeIndex
                    const isSelected = option.id === value
                    return (
                      <div
                        key={option.id}
                        id={`${listboxId}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        data-option-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => !option.disabled && commitSelection(option.id)}
                        className={joinClassNames(
                          "cursor-pointer px-3 py-2 transition",
                          isActive ? "bg-sky-500/15" : undefined,
                          isSelected ? "bg-sky-500/10" : undefined,
                          option.disabled ? "cursor-not-allowed opacity-50" : undefined,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                            {option.title}
                          </span>
                          {isSelected ? (
                            <span aria-hidden="true" className="text-xs text-sky-600">
                              ✓
                            </span>
                          ) : null}
                        </div>
                        {option.subtitles && option.subtitles.length > 0 ? (
                          <div className="mt-0.5 truncate text-xs text-[var(--foreground)]/55">
                            {option.subtitles.join(" · ")}
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
