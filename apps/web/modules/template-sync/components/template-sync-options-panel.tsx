"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { AsyncRichDropdownControllerOutput } from "@/controllers/dropdown-search"

const SEARCH_INPUT_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

const LOAD_MORE_SCROLL_THRESHOLD_PX = 80

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type TemplateSyncOptionRow = {
  id: string
  title: string
  subtitles: string[]
}

export type TemplateSyncOptionsPanelProps<TOption extends { id: string }> = {
  controller: AsyncRichDropdownControllerOutput<TOption>
  toOptionRow: (option: TOption) => TemplateSyncOptionRow
  currentValue: string | null
  currentLabel: string | null
  onSelect: (option: TOption | null) => void
  onCancel: () => void
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  loadingMoreMessage?: string
  clearLabel?: string
}

// Body-mode options surface. Mirrors the popover content of AsyncRichDropdown
// (search input + optional clear row + listbox) but anchored as the side-panel
// body block — no portal, fills the available height. Per-entity wrappers feed
// the controller + row mapper so the data-layer wiring stays colocated with
// each picker's options request.
export function TemplateSyncOptionsPanel<TOption extends { id: string }>({
  controller,
  toOptionRow,
  currentValue,
  currentLabel,
  onSelect,
  onCancel,
  searchPlaceholder = "Search",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  loadingMoreMessage = "Loading more…",
  clearLabel = "Clear selection",
}: TemplateSyncOptionsPanelProps<TOption>) {
  const listboxId = useId()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const listboxRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const rows = useMemo<TemplateSyncOptionRow[]>(
    () => controller.options.map(toOptionRow),
    [controller.options, toOptionRow],
  )

  const isLoading = controller.isLoading
  const isFetchingMore = controller.isFetchingMore
  const hasMore = controller.hasMore
  const loadMore = controller.loadMore
  const errorMessage = controller.errorMessage
  const showEmptyState = !isLoading && rows.length === 0 && !errorMessage

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
    (index: number) => {
      const option = controller.options[index]
      if (option) onSelect(option)
    },
    [controller.options, onSelect],
  )

  const commitClear = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (rows.length === 0) {
      setActiveIndex(-1)
      return
    }
    const currentIndex = rows.findIndex((row) => row.id === currentValue)
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [rows, currentValue])

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
          // Stop propagation so the SidePanelPreview Escape listener
          // doesn't dismiss the whole side panel — we only want to
          // collapse the inline options surface.
          event.preventDefault()
          event.stopPropagation()
          onCancel()
          return
        case "ArrowDown":
          if (rows.length === 0) return
          event.preventDefault()
          setActiveIndex((prev) => (prev < rows.length - 1 ? prev + 1 : 0))
          return
        case "ArrowUp":
          if (rows.length === 0) return
          event.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : rows.length - 1))
          return
        case "Home":
          if (rows.length === 0) return
          event.preventDefault()
          setActiveIndex(0)
          return
        case "End":
          if (rows.length === 0) return
          event.preventDefault()
          setActiveIndex(rows.length - 1)
          return
        case "Enter":
          event.preventDefault()
          if (activeIndex >= 0 && activeIndex < rows.length) {
            commitSelect(activeIndex)
          }
          return
      }
    },
    [rows, activeIndex, commitSelect, onCancel],
  )

  const hasSelection = currentValue !== null && currentLabel !== null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 pb-2">
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

      {hasSelection ? (
        <button
          type="button"
          onClick={commitClear}
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
          <div className="px-3 py-6 text-center text-sm text-rose-400">
            {errorMessage}
          </div>
        ) : isLoading && rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-[var(--foreground)]/55">
            {loadingMessage}
          </div>
        ) : showEmptyState ? (
          <div className="px-3 py-6 text-center text-sm text-[var(--foreground)]/55">
            {emptyMessage}
          </div>
        ) : (
          <>
            {rows.map((row, index) => {
              const isActive = index === activeIndex
              const isSelected = row.id === currentValue
              return (
                <div
                  key={row.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commitSelect(index)}
                  className={joinClassNames(
                    "cursor-pointer px-3 py-2 transition",
                    isActive ? "bg-sky-500/15" : undefined,
                    isSelected ? "bg-sky-500/10" : undefined,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                      {row.title}
                    </span>
                    {isSelected ? (
                      <span aria-hidden="true" className="text-xs text-sky-500">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  {row.subtitles.length > 0 ? (
                    <div className="mt-0.5 truncate text-xs text-[var(--foreground)]/55">
                      {row.subtitles.join(" · ")}
                    </div>
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
    </div>
  )
}
