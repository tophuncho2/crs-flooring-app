"use client"

import { useCallback, useMemo } from "react"
import type { InventoryLocationOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  INVENTORY_LOCATIONS_SEARCH_QUERY_KEY,
  searchInventoryLocationsRequest,
} from "@/modules/inventory/data/inventory-location-options-request"

export type LocationPickerProps = {
  value: string | null
  onChange: (value: string | null) => void
  /**
   * Required scope — locations are warehouse-scoped (distinct over the
   * inventory table). Picker renders disabled when null.
   */
  warehouseId: string | null
  /**
   * Pre-resolved label for the current `value`. Locations have no separate
   * id, so for the picker the value IS the label — pass the same string here
   * to keep the trigger labelled before the controller fetches.
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
  initialOptions?: InventoryLocationOption[]
}

function toDropdownOption(option: InventoryLocationOption): AsyncRichDropdownOption {
  return {
    id: option.value,
    title: option.value,
  }
}

export function LocationPicker({
  value,
  onChange,
  warehouseId,
  selectedLabel = null,
  placeholder = "Select Location",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search location",
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
    () => [...INVENTORY_LOCATIONS_SEARCH_QUERY_KEY, warehouseId ?? null] as const,
    [warehouseId],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchInventoryLocationsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
      }),
    [warehouseId],
  )

  const controller = useAsyncRichDropdownController<InventoryLocationOption>({
    bucketKey,
    searchFn,
    initialOptions,
    enabled,
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
      placeholder={enabled ? placeholder : disabledPlaceholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled || warehouseId === null}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
      // Locations are warehouse-derived — refetch on open so newly-typed
      // locations from concurrent inventory edits surface without a reload.
      onOpenChange={(isOpen) => {
        if (isOpen) controller.refetch()
      }}
    />
  )
}
