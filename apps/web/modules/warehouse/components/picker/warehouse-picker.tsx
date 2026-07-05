"use client"

import type { WarehouseOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  WAREHOUSE_OPTIONS_QUERY_KEY,
  searchWarehouseOptionsRequest,
} from "@/modules/warehouse/data/warehouse-options-request"

export type WarehousePickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full picked
   * option (or null on clear). Lets callers capture the selected name without
   * a seed lookup — used by the inventory-hub starting cascade.
   */
  onOptionSelected?: (option: WarehouseOption | null) => void
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
  onOptionSelected,
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
  return (
    <AsyncOptionPicker<WarehouseOption>
      value={value}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      selectedLabel={selectedLabel}
      bucketKey={WAREHOUSE_OPTIONS_QUERY_KEY}
      pagedSearchFn={searchWarehouseOptionsRequest}
      toOption={toDropdownOption}
      initialOptions={initialOptions}
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
