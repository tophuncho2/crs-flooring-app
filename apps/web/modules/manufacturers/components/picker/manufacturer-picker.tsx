"use client"

import { useCallback, useMemo } from "react"
import type { ManufacturerOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  MANUFACTURER_OPTIONS_QUERY_KEY,
  searchManufacturerOptionsRequest,
} from "@/modules/manufacturers/data/manufacturer-options-request"

export type ManufacturerPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected manufacturer's name even when it isn't in the latest server result.
   */
  selectedLabel?: string | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  /** Optional initial seed shown before the user types anything (e.g. SSR-loaded top 20). */
  initialOptions?: ManufacturerOption[]
}

function toDropdownOption(option: ManufacturerOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function ManufacturerPicker({
  value,
  onChange,
  selectedLabel = null,
  placeholder = "Select Manufacturer",
  searchPlaceholder = "Search manufacturers",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: ManufacturerPickerProps) {
  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchManufacturerOptionsRequest(search, signal, { skip }),
    [],
  )

  const controller = useAsyncRichDropdownController<ManufacturerOption>({
    bucketKey: MANUFACTURER_OPTIONS_QUERY_KEY,
    pagedSearchFn,
    initialOptions,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedLabel) return { id: value, title: selectedLabel }
    return null
  }, [selectedLabel, value])

  return (
    <AsyncRichDropdown
      value={value}
      onChange={onChange}
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
    />
  )
}
