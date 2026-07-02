"use client"

import { useCallback, useMemo } from "react"
import type { CategoryOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
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
  const controller = useAsyncRichDropdownController<CategoryOption>({
    bucketKey: CATEGORY_OPTIONS_QUERY_KEY,
    pagedSearchFn: searchCategoryOptionsRequest,
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
