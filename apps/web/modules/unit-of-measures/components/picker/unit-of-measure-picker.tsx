"use client"

import type { UnitOfMeasureOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
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
  return (
    <AsyncOptionPicker<UnitOfMeasureOption>
      value={value}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      selectedLabel={selectedLabel}
      bucketKey={UNIT_OF_MEASURE_OPTIONS_QUERY_KEY}
      pagedSearchFn={searchUnitOfMeasureOptionsRequest}
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
