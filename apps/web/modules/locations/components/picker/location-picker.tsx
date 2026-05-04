"use client"

import { useCallback, useMemo } from "react"
import type { LocationOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  LOCATION_OPTIONS_QUERY_KEY,
  searchLocationOptionsRequest,
} from "@/modules/locations/data/location-options-request"

export type LocationPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option. Lets callers reflect joined fields (locationCode) in
   * adjacent UI before save.
   */
  onOptionSelected?: (option: LocationOption | null) => void
  /**
   * Required scope — locations always belong to a warehouse. Picker
   * renders disabled when null. Search calls always include this in the
   * request and bucket key.
   */
  warehouseId: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render
   * the selected location's shortCode (Rx-Lx) even when it isn't in the
   * latest server result.
   */
  selectedLabel?: string | null
  placeholder?: string
  disabledPlaceholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  initialOptions?: LocationOption[]
}

function toDropdownOption(option: LocationOption): AsyncRichDropdownOption {
  return {
    id: option.id,
    title: option.shortCode,
    subtitles: option.locationCode ? [option.locationCode] : [],
  }
}

export function LocationPicker({
  value,
  onChange,
  onOptionSelected,
  warehouseId,
  selectedLabel = null,
  placeholder = "Select Location",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search Rx-Lx",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: LocationPickerProps) {
  const enabled = warehouseId !== null && !disabled

  const bucketKey = useMemo(
    () => [...LOCATION_OPTIONS_QUERY_KEY, warehouseId ?? null] as const,
    [warehouseId],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchLocationOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
      }),
    [warehouseId],
  )

  const controller = useAsyncRichDropdownController<LocationOption>({
    bucketKey,
    searchFn,
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
      isLoading={controller.isLoading || controller.isFetching}
      errorMessage={controller.errorMessage}
      placeholder={enabled ? placeholder : disabledPlaceholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled || warehouseId === null}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
