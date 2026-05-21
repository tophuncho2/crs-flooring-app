"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { PropertyOption } from "@builders/domain"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  PROPERTY_OPTIONS_QUERY_KEY,
  searchPropertyOptionsRequest,
} from "@/modules/properties/data/property-options-request"

const SEARCH_INPUT_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

const LOAD_MORE_SCROLL_THRESHOLD_PX = 80

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

type OptionRow = {
  id: string
  title: string
  subtitle: string | null
}

function toOptionRow(option: PropertyOption): OptionRow {
  const subtitle = option.address.trim().length > 0 ? option.address : null
  return { id: option.id, title: option.name, subtitle }
}

export type PropertyHubViewPropertyFilterOptionsPanelProps = {
  managementCompanyId: string
  selectedId: string | null
  selectedLabel: string | null
  onSelect: (id: string, label: string) => void
  onClear: () => void
  onCancel: () => void
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
}

/**
 * Body-mode property filter options panel for the hub-view templates view.
 * Mirrors `template-sync-options-panel`: search input + optional clear row +
 * scrollable listbox, fills the side-panel body height. Escape collapses
 * only the picker (stopPropagation so the SidePanelPreview's Escape handler
 * does not dismiss the whole panel).
 */
export function PropertyHubViewPropertyFilterOptionsPanel({
  managementCompanyId,
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
  onCancel,
  searchPlaceholder = "Search properties",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
}: PropertyHubViewPropertyFilterOptionsPanelProps) {
  const listboxId = useId()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const listboxRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const bucketKey = useMemo(
    () => [...PROPERTY_OPTIONS_QUERY_KEY, managementCompanyId] as const,
    [managementCompanyId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchPropertyOptionsRequest(search, signal, { managementCompanyId, skip }),
    [managementCompanyId],
  )

  const controller = useAsyncRichDropdownController<PropertyOption>({
    bucketKey,
    pagedSearchFn,
  })

  const options = useMemo<OptionRow[]>(
    () => controller.options.map(toOptionRow),
    [controller.options],
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
    (option: OptionRow) => {
      onSelect(option.id, option.title)
    },
    [onSelect],
  )

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (options.length === 0) {
      setActiveIndex(-1)
      return
    }
    const currentIndex = options.findIndex((option) => option.id === selectedId)
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [options, selectedId])

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
          <div className="px-3 py-6 text-center text-sm text-rose-400">
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
              const isSelected = option.id === selectedId
              return (
                <div
                  key={option.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commitSelect(option)}
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
                    {isSelected ? (
                      <span aria-hidden="true" className="text-xs text-sky-500">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  {option.subtitle ? (
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
