"use client"

import type { CategoryOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  CATEGORY_OPTIONS_QUERY_KEY,
  searchCategoryOptionsRequest,
} from "@/modules/categories/data/category-options-request"

export type CategoryPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full picked
   * option (or null on clear). Lets callers capture the selected name without
   * a seed lookup — used by the inventory-hub starting cascade.
   */
  onOptionSelected?: (option: CategoryOption | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected category's name even when it isn't in the latest server result.
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
  initialOptions?: CategoryOption[]
}

function toDropdownOption(option: CategoryOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function CategoryPicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Filter by category",
  searchPlaceholder = "Search categories",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: CategoryPickerProps) {
  return (
    <AsyncOptionPicker<CategoryOption>
      value={value}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      selectedLabel={selectedLabel}
      bucketKey={CATEGORY_OPTIONS_QUERY_KEY}
      pagedSearchFn={searchCategoryOptionsRequest}
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
