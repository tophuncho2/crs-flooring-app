"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { TemplateOption } from "@builders/domain"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  TEMPLATE_OPTIONS_QUERY_KEY,
  searchTemplateOptionsRequest,
} from "@/modules/templates/data/template-options-request"

const SEARCH_INPUT_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

type OptionRow = {
  id: string
  title: string
  subtitles: string[]
}

function toOptionRow(option: TemplateOption): OptionRow {
  const subtitles = option.description ? [option.description] : []
  return { id: option.id, title: option.unitType || "—", subtitles }
}

export type TemplateSyncOptionsPanelProps = {
  propertyId: string
  currentValue: string | null
  currentLabel: string | null
  onSelect: (id: string | null, label: string | null) => void
  onCancel: () => void
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
}

// Body-mode template options surface. Mirrors the popover content of
// AsyncRichDropdown (search input + optional clear row + listbox) but anchored
// as the side-panel body block — no portal, fills the available height.
// Shares the data layer with TemplatePicker (same controller hook, same
// search request, same bucket-key shape) so cache hits and selection
// semantics stay identical.
export function TemplateSyncOptionsPanel({
  propertyId,
  currentValue,
  currentLabel,
  onSelect,
  onCancel,
  searchPlaceholder = "Search templates",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
}: TemplateSyncOptionsPanelProps) {
  const listboxId = useId()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const listboxRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const bucketKey = useMemo(
    () => [...TEMPLATE_OPTIONS_QUERY_KEY, propertyId] as const,
    [propertyId],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchTemplateOptionsRequest(search, signal, { propertyId }),
    [propertyId],
  )

  const controller = useAsyncRichDropdownController<TemplateOption>({
    bucketKey,
    searchFn,
  })

  const options = useMemo<OptionRow[]>(
    () => controller.options.map(toOptionRow),
    [controller.options],
  )

  const isLoading = controller.isLoading || controller.isFetching
  const errorMessage = controller.errorMessage
  const showEmptyState = !isLoading && options.length === 0 && !errorMessage

  const commitSelect = useCallback(
    (option: OptionRow) => {
      onSelect(option.id, option.title)
    },
    [onSelect],
  )

  const commitClear = useCallback(() => {
    onSelect(null, null)
  }, [onSelect])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (options.length === 0) {
      setActiveIndex(-1)
      return
    }
    const currentIndex = options.findIndex((option) => option.id === currentValue)
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [options, currentValue])

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
          options.map((option, index) => {
            const isActive = index === activeIndex
            const isSelected = option.id === currentValue
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
                {option.subtitles.length > 0 ? (
                  <div className="mt-0.5 truncate text-xs text-[var(--foreground)]/55">
                    {option.subtitles.join(" · ")}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
