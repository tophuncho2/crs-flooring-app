"use client"

import type { PaletteColor, PaymentPurposeOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  PAYMENT_PURPOSE_OPTIONS_QUERY_KEY,
  searchPaymentPurposeOptionsRequest,
} from "@/modules/payment-purposes/data/payment-purpose-options-request"

export type PaymentPurposePickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Fires with the resolved option (or null on clear) whenever the selection
   * changes via the dropdown. Lets a host snapshot the name + color alongside
   * the id so the trigger chip never desyncs from the picked value.
   */
  onOptionSelected?: (option: PaymentPurposeOption | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected purpose's name even when it isn't in the latest server result.
   */
  selectedLabel?: string | null
  /**
   * Pre-resolved palette color for the current `value`. Tints the trigger chip
   * so the purpose reads with its color identity at rest (colored-chip trigger).
   */
  selectedColor?: PaletteColor | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  /** Optional initial seed shown before the user types anything. */
  initialOptions?: PaymentPurposeOption[]
}

function toDropdownOption(option: PaymentPurposeOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function PaymentPurposePicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  selectedColor = null,
  placeholder = "Select a purpose",
  searchPlaceholder = "Search purposes",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: PaymentPurposePickerProps) {
  return (
    <AsyncOptionPicker<PaymentPurposeOption>
      value={value}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      selectedLabel={selectedLabel}
      selectedColor={selectedColor}
      bucketKey={PAYMENT_PURPOSE_OPTIONS_QUERY_KEY}
      searchFn={searchPaymentPurposeOptionsRequest}
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
