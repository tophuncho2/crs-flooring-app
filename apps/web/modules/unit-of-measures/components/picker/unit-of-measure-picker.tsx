"use client"

import { useCallback, useMemo } from "react"
import type { UnitOfMeasureOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  UNIT_OF_MEASURE_OPTIONS_QUERY_KEY,
  searchUnitOfMeasureOptionsRequest,
} from "@/modules/unit-of-measures/data/unit-of-measure-options-request"

export type UnitOfMeasurePickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full picked
   * option (or null on clear). Lets callers capture the selected name without
   * a seed lookup.
   */
  onOptionSelected?: (option: UnitOfMeasureOption | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected unit's name even when it isn't in the latest server result.
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
  initialOptions?: UnitOfMeasureOption[]
}

// Pickers render the unit NAME only (per the UoM rendering matrix) — no abbrev subtitle.
function toDropdownOption(option: UnitOfMeasureOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function UnitOfMeasurePicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Select unit",
  searchPlaceholder = "Search units",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: UnitOfMeasurePickerProps) {
  const controller = useAsyncRichDropdownController<UnitOfMeasureOption>({
    bucketKey: UNIT_OF_MEASURE_OPTIONS_QUERY_KEY,
    pagedSearchFn: searchUnitOfMeasureOptionsRequest,
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
      hasMore={controller.hasMore}
      isFetchingMore={controller.isFetchingMore}
      onLoadMore={controller.loadMore}
    />
  )
}
