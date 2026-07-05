"use client"

import { useCallback, useMemo } from "react"
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
export type AsyncOptionPickerProps<TOption extends { id: string }> = {
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
  /** Maps a domain option to the dropdown's presentation shape. */
  toOption: (option: TOption) => AsyncRichDropdownOption
  initialOptions?: TOption[]
  enabled?: boolean
  stackSubtitles?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
}

export function AsyncOptionPicker<TOption extends { id: string }>({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  bucketKey,
  searchFn,
  pagedSearchFn,
  toOption,
  initialOptions,
  enabled,
  stackSubtitles,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  clearLabel,
  disabled,
  invalid,
  ariaLabel,
  className,
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
        const option = id ? controller.options.find((o) => o.id === id) ?? null : null
        onOptionSelected(option)
      }
    },
    [onChange, onOptionSelected, controller.options],
  )

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toOption),
    [controller.options, toOption],
  )

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
      query={controller.query}
      onQueryChange={controller.onQueryChange}
      isLoading={controller.isLoading}
      errorMessage={controller.errorMessage}
      placeholder={placeholder}
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
    />
  )
}
