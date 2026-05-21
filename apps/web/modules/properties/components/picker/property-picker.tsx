"use client"

import { useCallback, useMemo } from "react"
import type { PropertyOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  PROPERTY_OPTIONS_QUERY_KEY,
  searchPropertyOptionsRequest,
} from "@/modules/properties/data/property-options-request"

export type PropertyPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option (or null on clear). Lets callers reflect the picked
   * property's joined fields in adjacent UI before save — e.g. the WO
   * record's address preview cells.
   *
   * Only fires when the option is present in the picker's current
   * search results; the picker does not refetch by id.
   */
  onOptionSelected?: (option: PropertyOption | null) => void
  /**
   * Optional management-company filter. When set, only properties belonging
   * to that company are returned. Also folded into the controller's bucket
   * key so React Query buckets results per filter.
   */
  managementCompanyId?: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected property's name even when it isn't in the latest server result.
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
  initialOptions?: PropertyOption[]
}

function toDropdownOption(option: PropertyOption): AsyncRichDropdownOption {
  const subtitles = option.address ? [option.address] : []
  return { id: option.id, title: option.name, subtitles }
}

export function PropertyPicker({
  value,
  onChange,
  onOptionSelected,
  managementCompanyId = null,
  selectedLabel = null,
  placeholder = "Select a property",
  searchPlaceholder = "Search properties",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: PropertyPickerProps) {
  const bucketKey = useMemo(
    () => [...PROPERTY_OPTIONS_QUERY_KEY, managementCompanyId ?? null] as const,
    [managementCompanyId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchPropertyOptionsRequest(search, signal, {
        managementCompanyId: managementCompanyId ?? undefined,
        skip,
      }),
    [managementCompanyId],
  )

  const controller = useAsyncRichDropdownController<PropertyOption>({
    bucketKey,
    pagedSearchFn,
    initialOptions,
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
    />
  )
}
