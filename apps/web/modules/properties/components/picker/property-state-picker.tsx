"use client"

import { useCallback, useMemo } from "react"
import type { PropertyStateOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  PROPERTY_STATES_SEARCH_QUERY_KEY,
  searchPropertyStatesRequest,
} from "@/modules/properties/data/property-state-options-request"

export type PropertyStatePickerProps = {
  value: string | null
  onChange: (value: string | null) => void
  /**
   * Pre-resolved label for the current `value`. State options have no separate
   * id — the 2-letter code is both id and label, so pass the same string here
   * to keep the trigger labelled before the controller fetches.
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
  initialOptions?: PropertyStateOption[]
}

function toDropdownOption(option: PropertyStateOption): AsyncRichDropdownOption {
  return {
    id: option.value,
    title: option.value,
  }
}

export function PropertyStatePicker({
  value,
  onChange,
  selectedLabel = null,
  placeholder = "Select state",
  searchPlaceholder = "Search state",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: PropertyStatePickerProps) {
  const bucketKey = useMemo(
    () => [...PROPERTY_STATES_SEARCH_QUERY_KEY] as const,
    [],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchPropertyStatesRequest(search, signal),
    [],
  )

  const controller = useAsyncRichDropdownController<PropertyStateOption>({
    bucketKey,
    searchFn,
    initialOptions,
    enabled: !disabled,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    const label = selectedLabel ?? value
    return { id: value, title: label }
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
