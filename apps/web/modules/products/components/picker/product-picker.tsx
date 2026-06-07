"use client"

import { useCallback, useMemo } from "react"
import type { ProductOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  PRODUCT_OPTIONS_QUERY_KEY,
  searchProductOptionsRequest,
} from "@/modules/products/data/product-options-request"

export type ProductPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option (or null on clear). Lets callers reflect the picked
   * product's joined fields (categoryId, sendUnit*) in adjacent UI
   * before save.
   *
   * Only fires when the option is present in the picker's current
   * search results; the picker does not refetch by id.
   */
  onOptionSelected?: (option: ProductOption | null) => void
  /**
   * Optional category filter. When set, only products in that category
   * are returned. Folded into the controller's bucket key so React
   * Query buckets results per filter.
   */
  categoryId?: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected product's name even when it isn't in the latest server result.
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
  initialOptions?: ProductOption[]
}

function toDropdownOption(option: ProductOption): AsyncRichDropdownOption {
  const subtitles = option.sendUnitAbbrev ? [option.sendUnitAbbrev] : []
  return { id: option.id, title: option.name, subtitles }
}

export function ProductPicker({
  value,
  onChange,
  onOptionSelected,
  categoryId = null,
  selectedLabel = null,
  placeholder = "Select a product",
  searchPlaceholder = "Search products",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: ProductPickerProps) {
  const bucketKey = useMemo(
    () => [...PRODUCT_OPTIONS_QUERY_KEY, categoryId ?? null] as const,
    [categoryId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchProductOptionsRequest(search, signal, {
        categoryId: categoryId ?? undefined,
        skip,
      }),
    [categoryId],
  )

  const controller = useAsyncRichDropdownController<ProductOption>({
    bucketKey,
    pagedSearchFn,
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
      isLoading={controller.isLoading}
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
