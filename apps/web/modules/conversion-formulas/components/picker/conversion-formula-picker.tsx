"use client"

import type { ConversionFormulaOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  CONVERSION_FORMULA_OPTIONS_QUERY_KEY,
  searchConversionFormulaOptionsRequest,
} from "@/modules/conversion-formulas/data/conversion-formula-options-request"

export type ConversionFormulaPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /** Fires alongside onChange with the full picked option (or null on clear). */
  onOptionSelected?: (option: ConversionFormulaOption | null) => void
  /** Pre-resolved label for the current `value` (the formula name). */
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
  initialOptions?: ConversionFormulaOption[]
}

// The formula `name` already reads "Sq Ft → Boxes (÷ coverage)" — render it directly.
function toDropdownOption(option: ConversionFormulaOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function ConversionFormulaPicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Select formula",
  searchPlaceholder = "Search formulas",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: ConversionFormulaPickerProps) {
  return (
    <AsyncOptionPicker<ConversionFormulaOption>
      value={value}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      selectedLabel={selectedLabel}
      bucketKey={CONVERSION_FORMULA_OPTIONS_QUERY_KEY}
      pagedSearchFn={searchConversionFormulaOptionsRequest}
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
