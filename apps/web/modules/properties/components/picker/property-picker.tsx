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

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchPropertyOptionsRequest(search, signal, {
        managementCompanyId: managementCompanyId ?? undefined,
      }),
    [managementCompanyId],
  )

  const controller = useAsyncRichDropdownController<PropertyOption>({
    bucketKey,
    searchFn,
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
      isLoading={controller.isLoading || controller.isFetching}
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
    />
  )
}
