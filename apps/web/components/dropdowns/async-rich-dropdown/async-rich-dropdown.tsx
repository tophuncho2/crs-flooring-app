"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { AsyncRichDropdownOption } from "./contracts/async-rich-dropdown-option"

// Trigger chrome matches `SelectDropdown` exactly so AsyncRichDropdown drops
// into the same grid cells without visual drift between rows that use one vs
// the other.
const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
const TRIGGER_INVALID_CLASS_NAME =
  "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/40"

const POPOVER_CLASS_NAME =
  "flex max-h-80 flex-col rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl focus:outline-none"

const SEARCH_INPUT_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

// Maximum popover height matches `max-h-80` in POPOVER_CLASS_NAME (20rem
// ≈ 320px). Used to compute viewport-aware flip-up placement.
const POPOVER_MAX_HEIGHT_PX = 320
const POPOVER_VIEWPORT_GUTTER_PX = 8

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type AsyncRichDropdownProps = {
  value: string | null
  onChange: (value: string | null) => void
  options: ReadonlyArray<AsyncRichDropdownOption>
  query: string
  onQueryChange: (value: string) => void
  isLoading?: boolean
  errorMessage?: string | null
  selectedOption?: AsyncRichDropdownOption | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  /**
   * Fired with `true` when the popover opens, `false` when it closes. Lets
   * consumers gate their async controllers (e.g. only fire the search query
   * once the popover is open) so dense grids don't fan out N parallel
   * requests at mount time.
   */
  onOpenChange?: (open: boolean) => void
}

/**
 * Server-search variant of `RichDropdown`. Identical popover chrome — search
 * input + scrollable list + clear affordance + keyboard navigation — but no
 * local substring filter. Consumers wire `query`/`onQueryChange` through a
 * controller that fetches options server-side, so the dropdown can power
 * pickers backed by paginated APIs.
 *
 * `selectedOption` is supplied separately because a server-driven options list
 * may not contain the currently selected row (e.g. user picked "Acme" earlier,
 * then typed "ze" in the search and got back zero hits — Acme should still
 * render in the trigger).
 */
export function AsyncRichDropdown({
  value,
  onChange,
  options,
  query,
  onQueryChange,
  isLoading = false,
  errorMessage = null,
  selectedOption = null,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled = false,
  invalid = false,
  ariaLabel,
  className,
  onOpenChange,
}: AsyncRichDropdownProps) {
  const listboxId = useId()
  const [open, setOpenState] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  const setOpen = useCallback<typeof setOpenState>((next) => {
    setOpenState((previous) => {
      const resolved = typeof next === "function" ? next(previous) : next
      if (resolved !== previous) {
        onOpenChangeRef.current?.(resolved)
      }
      return resolved
    })
  }, [])

  const visibleSelected = useMemo(() => {
    if (!value) return null
    if (selectedOption && selectedOption.id === value) return selectedOption
    return options.find((option) => option.id === value) ?? null
  }, [options, selectedOption, value])

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
    onQueryChange("")
    const trigger = containerRef.current?.querySelector<HTMLButtonElement>(
      "button[data-async-rich-dropdown-trigger]",
    )
    trigger?.focus()
  }, [onQueryChange])

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

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
      setActiveIndex(-1)
      onQueryChange("")
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, onQueryChange])

  useEffect(() => {
    if (!open) return
    function updateRect() {
      const trigger = containerRef.current?.querySelector<HTMLButtonElement>(
        "button[data-async-rich-dropdown-trigger]",
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

  // Reset active index when the option list changes; preserve the selected
  // row's index when it appears in the current page of results.
  useEffect(() => {
    if (!open) return
    if (options.length === 0) {
      setActiveIndex(-1)
      return
    }
    const currentIndex = options.findIndex((option) => option.id === value)
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [open, options, value])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = popoverRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    )
    node?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

  useEffect(() => {
    if (!open) return
    searchInputRef.current?.focus()
  }, [open])

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
          if (options.length === 0) return
          event.preventDefault()
          setActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
          return
        case "ArrowUp":
          if (options.length === 0) return
          event.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
          return
        case "Home":
          if (options.length === 0) return
          event.preventDefault()
          setActiveIndex(0)
          return
        case "End":
          if (options.length === 0) return
          event.preventDefault()
          setActiveIndex(options.length - 1)
          return
        case "Enter":
          event.preventDefault()
          if (activeIndex >= 0 && activeIndex < options.length) {
            const option = options[activeIndex]
            if (!option.disabled) commitSelection(option.id)
          }
          return
      }
    },
    [options, activeIndex, commitSelection, closeAndReturnFocus],
  )

  const triggerLabel = visibleSelected ? visibleSelected.title : placeholder
  const showEmptyState = !isLoading && options.length === 0 && !errorMessage

  // Viewport-aware popover placement: prefer below the trigger when there is
  // room for the full max-height popover; otherwise flip above when the
  // upward space is bigger. Falls back to "below, clipped" if neither side
  // fits cleanly so the popover never positions itself off-screen.
  const popoverPlacement = useMemo(() => {
    if (!triggerRect || typeof window === "undefined") {
      return null
    }
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - triggerRect.bottom - POPOVER_VIEWPORT_GUTTER_PX
    const spaceAbove = triggerRect.top - POPOVER_VIEWPORT_GUTTER_PX
    const fitsBelow = spaceBelow >= POPOVER_MAX_HEIGHT_PX
    const fitsAbove = spaceAbove >= POPOVER_MAX_HEIGHT_PX
    const placeAbove = !fitsBelow && (fitsAbove || spaceAbove > spaceBelow)
    const availableHeight = Math.max(0, placeAbove ? spaceAbove : spaceBelow)
    const maxHeight = Math.min(POPOVER_MAX_HEIGHT_PX, availableHeight)
    return placeAbove
      ? {
          top: triggerRect.top - maxHeight - 6,
          maxHeight,
        }
      : {
          top: triggerRect.bottom + 6,
          maxHeight,
        }
  }, [triggerRect])

  return (
    <div ref={containerRef} className={joinClassNames("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        data-async-rich-dropdown-trigger
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
            !visibleSelected ? "text-[var(--foreground)]/60" : undefined,
          )}
        >
          {triggerLabel}
        </span>
        <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
          ▾
        </span>
      </button>

      {open && triggerRect && popoverPlacement && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              style={{
                position: "fixed",
                top: popoverPlacement.top,
                left: triggerRect.left,
                minWidth: triggerRect.width,
                maxWidth: `min(32rem, calc(100vw - ${Math.max(triggerRect.left, 0) + 8}px))`,
                maxHeight: popoverPlacement.maxHeight,
                zIndex: 1000,
              }}
              className={POPOVER_CLASS_NAME}
            >
              <div className="border-b border-[var(--panel-border)] p-2">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  aria-controls={listboxId}
                  aria-activedescendant={
                    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
                  }
                  className={SEARCH_INPUT_CLASS_NAME}
                />
              </div>

              {visibleSelected ? (
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
                aria-busy={isLoading || undefined}
                className="min-h-0 flex-1 overflow-y-auto py-1"
              >
                {errorMessage ? (
                  <div className="px-3 py-6 text-center text-sm text-rose-600">
                    {errorMessage}
                  </div>
                ) : isLoading && options.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-[var(--foreground)]/55">
                    {loadingMessage}
                  </div>
                ) : showEmptyState ? (
                  <div className="px-3 py-6 text-center text-sm text-[var(--foreground)]/55">
                    {emptyMessage}
                  </div>
                ) : (
                  options.map((option, index) => {
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
