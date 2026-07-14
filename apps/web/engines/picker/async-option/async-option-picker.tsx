"use client"

import { useCallback, useMemo } from "react"
import type { PaletteColor } from "@/engines/common"
import {
  AsyncRichDropdown,
  type AsyncRichDropdownOption,
} from "../controls"
import {
  type AsyncRichDropdownPagedPage,
  useAsyncRichDropdownController,
} from "../client"

/**
 * Shared base for the module entity pickers (Warehouse, Category, JobType,
 * Product, Property, Template). Each of those wraps this, keeping its own
 * public props/export name and supplying only what varies: the query
 * `bucketKey`, the search fn, the `toOption` mapper, and (Template only)
 * `stackSubtitles`. The scaffold — controller wiring, `handleChange` +
 * `onOptionSelected` resolution, option mapping, `selectedOption` derivation,
 * and the `AsyncRichDropdown` render — lives here once.
 *
 * Pagination is a controller-input concern only: a wrapper supplies either a
 * single-page `searchFn` XOR a `pagedSearchFn`. The render always forwards
 * `hasMore`/`isFetchingMore`/`onLoadMore` — for a `searchFn` picker the
 * controller reports `hasMore=false` and a no-op `loadMore`, so it is
 * behavior-identical to omitting them.
 */
export type AsyncOptionPickerProps<TOption> = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Fires alongside `onChange` with the full picked option (or null on clear),
   * resolved from the current search results. The picker does not refetch by
   * id, so it only fires when the option is present in `controller.options`.
   */
  onOptionSelected?: (option: TOption | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected record's label even when it isn't in the latest server result.
   */
  selectedLabel?: string | null
  /**
   * Optional palette color for the selected value. Threaded to the trigger so
   * the selected label renders inside its palette chip (opt-in colored-chip
   * trigger). Omit for the plain-text trigger.
   */
  selectedColor?: PaletteColor | null
  /** Stable cache-key prefix (scope-folded by the wrapper where needed). */
  bucketKey: ReadonlyArray<unknown>
  /** Single-page fetch. Mutually exclusive with `pagedSearchFn`. */
  searchFn?: (query: string, signal: AbortSignal | undefined) => Promise<TOption[]>
  /** Paginated fetch (infinite scroll). Mutually exclusive with `searchFn`. */
  pagedSearchFn?: (
    query: string,
    signal: AbortSignal | undefined,
    skip: number,
  ) => Promise<AsyncRichDropdownPagedPage<TOption>>
  /**
   * Maps a domain option to the dropdown's presentation shape. May return
   * `null` to drop an option (e.g. a blank value that must not be pickable);
   * the base skips nulls and dedupes the result by `id`.
   */
  toOption: (option: TOption) => AsyncRichDropdownOption | null
  initialOptions?: TOption[]
  enabled?: boolean
  stackSubtitles?: boolean
  placeholder?: string
  /** Placeholder shown while `disabled` (e.g. "Select warehouse first"). */
  disabledPlaceholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  /**
   * When true, forces a fresh fetch each time the popover opens (on top of the
   * controller's mount-time `FRESH_ON_OPEN` freshness). Opt-in — only for
   * pickers whose options are materialized live while the page stays mounted
   * (inventory-derived import#/PO#/location).
   */
  refetchOnOpen?: boolean
}

export function AsyncOptionPicker<TOption>({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  selectedColor = null,
  bucketKey,
  searchFn,
  pagedSearchFn,
  toOption,
  initialOptions,
  enabled,
  stackSubtitles,
  placeholder,
  disabledPlaceholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  clearLabel,
  disabled,
  invalid,
  ariaLabel,
  className,
  refetchOnOpen,
}: AsyncOptionPickerProps<TOption>) {
  const controller = useAsyncRichDropdownController<TOption>({
    bucketKey,
    searchFn,
    pagedSearchFn,
    initialOptions,
    enabled,
  })

  const handleChange = useCallback(
    (id: string | null) => {
      onChange(id)
      if (onOptionSelected) {
        // Match on the mapped dropdown id (what the listbox actually selects
        // on) rather than assuming a raw `id` field — some option types are
        // keyed by another field (e.g. inventory value pickers).
        const option = id
          ? controller.options.find((o) => toOption(o)?.id === id) ?? null
          : null
        onOptionSelected(option)
      }
    },
    [onChange, onOptionSelected, controller.options, toOption],
  )

  const options = useMemo<AsyncRichDropdownOption[]>(() => {
    const out: AsyncRichDropdownOption[] = []
    const seen = new Set<string>()
    for (const option of controller.options) {
      const mapped = toOption(option)
      if (!mapped || seen.has(mapped.id)) continue
      seen.add(mapped.id)
      out.push(mapped)
    }
    return out
  }, [controller.options, toOption])

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedLabel) return { id: value, title: selectedLabel }
    return null
  }, [selectedLabel, value])

  return (
    <AsyncRichDropdown
      value={value}
      onChange={handleChange}
      options={options}
      selectedOption={selectedOption}
      selectedColor={selectedColor}
      query={controller.query}
      onQueryChange={controller.onQueryChange}
      isLoading={controller.isLoading}
      errorMessage={controller.errorMessage}
      placeholder={disabled && disabledPlaceholder ? disabledPlaceholder : placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
      hasMore={controller.hasMore}
      isFetchingMore={controller.isFetchingMore}
      onLoadMore={controller.loadMore}
      stackSubtitles={stackSubtitles}
      onOpenChange={
        refetchOnOpen
          ? (isOpen) => {
              if (isOpen) controller.refetch()
            }
          : undefined
      }
    />
  )
}
