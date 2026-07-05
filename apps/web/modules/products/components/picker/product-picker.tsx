"use client"

import { useCallback, useMemo } from "react"
import type { ProductOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
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
   * product's joined fields (categoryId, unit*) in adjacent UI
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
  const subtitles = option.unitAbbrev ? [option.unitAbbrev] : []
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

  return (
    <AsyncOptionPicker<ProductOption>
      value={value}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      selectedLabel={selectedLabel}
      bucketKey={bucketKey}
      pagedSearchFn={pagedSearchFn}
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
