"use client"

import { useCallback, useMemo } from "react"
import type { SectionOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  SECTION_OPTIONS_QUERY_KEY,
  searchSectionOptionsRequest,
} from "@/modules/warehouse-sections/data/section-options-request"

export type SectionPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option. Lets callers reflect joined fields in adjacent UI
   * before save.
   */
  onOptionSelected?: (option: SectionOption | null) => void
  /**
   * Required scope — sections always belong to a warehouse. Picker
   * renders disabled when null. Search calls always include this in the
   * request and bucket key.
   */
  warehouseId: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render
   * the selected section's label even when it isn't in the latest server
   * result.
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
  initialOptions?: SectionOption[]
}

function toDropdownOption(option: SectionOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.label }
}

export function SectionPicker({
  value,
  onChange,
  onOptionSelected,
  warehouseId,
  selectedLabel = null,
  placeholder = "Select Section",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search section #",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: SectionPickerProps) {
  const enabled = warehouseId !== null && !disabled

  const bucketKey = useMemo(
    () => [...SECTION_OPTIONS_QUERY_KEY, warehouseId ?? null] as const,
    [warehouseId],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchSectionOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
      }),
    [warehouseId],
  )

  const controller = useAsyncRichDropdownController<SectionOption>({
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
