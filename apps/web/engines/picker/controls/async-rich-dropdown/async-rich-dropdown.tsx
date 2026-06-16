"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { computePopoverPlacement } from "@/engines/common"
import type { AsyncRichDropdownOption } from "./contracts/async-rich-dropdown-option"

const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
const TRIGGER_INVALID_CLASS_NAME =
  "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/40"

const POPOVER_CLASS_NAME =
  "flex flex-col rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl focus:outline-none"

const SEARCH_INPUT_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

const LOAD_MORE_SCROLL_THRESHOLD_PX = 80

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
  loadingMoreMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  /**
   * Fires whenever the popover's open state transitions. Used by pickers
   * whose option subtitles surface mutable state (e.g. inventory stock
   * balance) to force a refetch on every open — wire via
   * `onOpenChange={(open) => { if (open) controller.refetch() }}`.
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Pagination wiring. When `hasMore` is true the listbox calls
   * `onLoadMore` as the user nears the bottom; `isFetchingMore` renders a
   * footer affordance during the fetch. Pickers backed by a paginated
   * options endpoint thread these straight from the controller.
   */
  hasMore?: boolean
  isFetchingMore?: boolean
  onLoadMore?: () => void
  /**
   * Render each subtitle on its own line instead of joining them with " · ".
   * Opt-in so dropdowns that pack multiple parts into one line (inventory,
   * adjustments) stay unchanged; template pickers use it for a stacked card.
   */
  stackSubtitles?: boolean
}

/**
 * Server-search rich dropdown. Popover chrome — search input + scrollable
 * list + clear affordance + keyboard navigation — with no local substring
 * filter. Consumers wire `query`/`onQueryChange` through a
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
  loadingMoreMessage = "Loading more…",
  clearLabel = "Clear selection",
  disabled = false,
  invalid = false,
  ariaLabel,
  className,
  onOpenChange,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  stackSubtitles = false,
}: AsyncRichDropdownProps) {
  const listboxId = useId()
  const [open, setOpen] = useState(false)

  // Fire `onOpenChange` on every open-state transition. The ref dance keeps
  // the effect from re-firing when the callback identity flips between
  // renders — consumers are free to pass inline lambdas.
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])
  const previousOpenRef = useRef(open)
  useEffect(() => {
    if (previousOpenRef.current === open) return
    previousOpenRef.current = open
    onOpenChangeRef.current?.(open)
  }, [open])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

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

  // Reset active index when the dropdown opens or the option list / value
  // changes; preserve the selected row's index when present. Derived during
  // render (keyed on option ids so an unstable `options` prop can't loop it).
  const optionsKey = options.map((option) => option.id).join(",")
  const [activeReset, setActiveReset] = useState({ open, optionsKey, value })
  if (
    activeReset.open !== open ||
    activeReset.optionsKey !== optionsKey ||
    activeReset.value !== value
  ) {
    setActiveReset({ open, optionsKey, value })
    if (open) {
      if (options.length === 0) {
        setActiveIndex(-1)
      } else {
        const currentIndex = options.findIndex((option) => option.id === value)
        setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
      }
    }
  }

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = popoverRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    )
    node?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

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

  const handleListboxScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || !onLoadMore || isFetchingMore) return
      const target = event.currentTarget
      const distanceFromBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight
      if (distanceFromBottom <= LOAD_MORE_SCROLL_THRESHOLD_PX) {
        onLoadMore()
      }
    },
    [hasMore, isFetchingMore, onLoadMore],
  )

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
                onScroll={handleListboxScroll}
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
                  <>
                    {options.map((option, index) => {
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
                            {option.meta ? (
                              <span className="shrink-0 text-xs tabular-nums text-[var(--foreground)]/55">
                                {option.meta}
                              </span>
                            ) : null}
                            {isSelected ? (
                              <span aria-hidden="true" className="text-xs text-sky-600">
                                ✓
                              </span>
                            ) : null}
                          </div>
                          {option.subtitles && option.subtitles.length > 0 ? (
                            stackSubtitles ? (
                              option.subtitles.map((line, lineIndex) => (
                                <div
                                  key={`${lineIndex}:${line}`}
                                  className="mt-0.5 truncate text-xs text-[var(--foreground)]/55"
                                >
                                  {line}
                                </div>
                              ))
                            ) : (
                              <div className="mt-0.5 truncate text-xs text-[var(--foreground)]/55">
                                {option.subtitles.join(" · ")}
                              </div>
                            )
                          ) : null}
                        </div>
                      )
                    })}
                    {isFetchingMore ? (
                      <div className="px-3 py-3 text-center text-xs text-[var(--foreground)]/55">
                        {loadingMoreMessage}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
