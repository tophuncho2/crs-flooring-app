"use client"

import { useMemo } from "react"
import type { WarehouseOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  WAREHOUSE_OPTIONS_QUERY_KEY,
  searchWarehouseOptionsRequest,
} from "@/modules/warehouse/data/warehouse-options-request"

export type WarehousePickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected warehouse's name even when it isn't in the latest server result.
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
  initialOptions?: WarehouseOption[]
}

function toDropdownOption(option: WarehouseOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function WarehousePicker({
  value,
  onChange,
  selectedLabel = null,
  placeholder = "Filter by warehouse",
  searchPlaceholder = "Search warehouses",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: WarehousePickerProps) {
  const controller = useAsyncRichDropdownController<WarehouseOption>({
    bucketKey: WAREHOUSE_OPTIONS_QUERY_KEY,
    searchFn: searchWarehouseOptionsRequest,
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
