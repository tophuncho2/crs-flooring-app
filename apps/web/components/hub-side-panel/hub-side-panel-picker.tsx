"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import type { AsyncRichDropdownControllerOutput } from "@/controllers/dropdown-search"

const SEARCH_INPUT_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

const LOAD_MORE_SCROLL_THRESHOLD_PX = 80

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type HubSidePanelPickerOption = {
  id: string
  title: string
  subtitle?: string | null
  /**
   * Multiple stacked sub-lines, one per row. Takes precedence over
   * `subtitle` when non-empty. Use for richer option cards (e.g. a template's
   * job type + description).
   */
  subtitles?: string[]
  /** Small trailing detail rendered by the title (e.g. an item count). */
  meta?: ReactNode
}

export type HubSidePanelPickerProps<TOption> = {
  controller: AsyncRichDropdownControllerOutput<TOption>
  toOption: (raw: TOption) => HubSidePanelPickerOption
  selectedId: string | null
  /**
   * Pre-resolved label for the selected id. Used to render the "Clear
   * selection" row even when the current selection is not in the latest
   * server page.
   */
  selectedLabel: string | null
  onSelect: (option: HubSidePanelPickerOption, raw: TOption) => void
  onClear: () => void
  onCancel: () => void
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  /**
   * When provided, the search input renders into this element (via a portal)
   * instead of inline above the option list. Lets a consumer pin the search in
   * a sticky header above the scrolling list. Query wiring, focus, and keyboard
   * navigation are unchanged. Defaults to inline.
   */
  searchPortalTarget?: HTMLElement | null
}

/**
 * Inline-in-body picker shell. Search input + listbox + load-more, fills the
 * side-panel body height. Escape collapses only the picker (the consumer's
 * `onCancel` re-focuses the trigger and the parent's Escape handler does not
 * dismiss the whole panel because we stop propagation here).
 *
 * Pure UI — consumers supply the dropdown controller and an option mapper.
 */
export function HubSidePanelPicker<TOption>({
  controller,
  toOption,
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
  onCancel,
  searchPlaceholder = "Search",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  searchPortalTarget,
}: HubSidePanelPickerProps<TOption>) {
  const listboxId = useId()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const listboxRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const options = useMemo<Array<{ option: HubSidePanelPickerOption; raw: TOption }>>(
    () => controller.options.map((raw) => ({ option: toOption(raw), raw })),
    [controller.options, toOption],
  )

  const isLoading = controller.isLoading
  const isFetchingMore = controller.isFetchingMore
  const hasMore = controller.hasMore
  const loadMore = controller.loadMore
  const errorMessage = controller.errorMessage
  const showEmptyState = !isLoading && options.length === 0 && !errorMessage

  const handleListboxScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || isFetchingMore) return
      const target = event.currentTarget
      const distanceFromBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight
      if (distanceFromBottom <= LOAD_MORE_SCROLL_THRESHOLD_PX) {
        loadMore()
      }
    },
    [hasMore, isFetchingMore, loadMore],
  )

  const commitSelect = useCallback(
    (entry: { option: HubSidePanelPickerOption; raw: TOption }) => {
      onSelect(entry.option, entry.raw)
    },
    [onSelect],
  )

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Point the active row at the selected option on mount and whenever the
  // option list / selectedId changes. Derived during render (keyed on option
  // ids so an unstable list can't loop it); the null sentinel makes it run on
  // first render, matching the previous mount effect.
  const optionsKey = options.map((entry) => entry.option.id).join(",")
  const [activeReset, setActiveReset] = useState<
    { optionsKey: string; selectedId: string | null } | null
  >(null)
  if (
    activeReset === null ||
    activeReset.optionsKey !== optionsKey ||
    activeReset.selectedId !== selectedId
  ) {
    setActiveReset({ optionsKey, selectedId })
    if (options.length === 0) {
      setActiveIndex(-1)
    } else {
      const currentIndex = options.findIndex((entry) => entry.option.id === selectedId)
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }

  useEffect(() => {
    if (activeIndex < 0) return
    const node = listboxRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    )
    node?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault()
          event.stopPropagation()
          onCancel()
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
            commitSelect(options[activeIndex])
          }
          return
      }
    },
    [options, activeIndex, commitSelect, onCancel],
  )

  const hasSelection = selectedId !== null && selectedLabel !== null

  const searchNode = (
    <div className={joinClassNames("shrink-0", searchPortalTarget ? null : "pb-2")}>
      <input
        ref={searchInputRef}
        type="search"
        value={controller.query}
        onChange={(event) => controller.onQueryChange(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder={searchPlaceholder}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        className={SEARCH_INPUT_CLASS_NAME}
      />
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {searchPortalTarget ? createPortal(searchNode, searchPortalTarget) : searchNode}

      {hasSelection ? (
        <button
          type="button"
          onClick={onClear}
          className="flex shrink-0 items-center gap-2 rounded-md border border-[var(--panel-border)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/15 hover:text-[var(--foreground)]"
        >
          <span aria-hidden="true">✕</span>
          <span>{clearLabel}</span>
        </button>
      ) : null}

      <div
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        tabIndex={-1}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-busy={isLoading || undefined}
        onScroll={handleListboxScroll}
        className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-md border border-[var(--panel-border)] py-1"
      >
        {errorMessage ? (
          <div className="px-3 py-6 text-center text-sm text-rose-400">{errorMessage}</div>
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
            {options.map((entry, index) => {
              const { option } = entry
              const isActive = index === activeIndex
              const isSelected = option.id === selectedId
              return (
                <div
                  key={option.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commitSelect(entry)}
                  className={joinClassNames(
                    "cursor-pointer px-3 py-2 transition",
                    isActive ? "bg-sky-500/15" : undefined,
                    isSelected ? "bg-sky-500/10" : undefined,
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
                      <span aria-hidden="true" className="text-xs text-sky-500">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  {option.subtitles && option.subtitles.length > 0 ? (
                    option.subtitles.map((line, lineIndex) => (
                      <div
                        key={`${lineIndex}:${line}`}
                        className="mt-0.5 truncate text-xs text-[var(--foreground)]/55"
                      >
                        {line}
                      </div>
                    ))
                  ) : option.subtitle ? (
                    <div className="mt-0.5 truncate text-xs text-[var(--foreground)]/55">
                      {option.subtitle}
                    </div>
                  ) : null}
                </div>
              )
            })}
            {isFetchingMore ? (
              <div className="px-3 py-3 text-center text-xs text-[var(--foreground)]/55">
                Loading more…
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
