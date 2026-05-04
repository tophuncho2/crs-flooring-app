"use client"

import { useCallback, useMemo, useState } from "react"
import type { ProductPickerOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  productOptionsQueryKey,
  searchProductOptionsRequest,
} from "@/modules/products/data/product-options-request"

export type ProductPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional companion to `onChange`. Fires with the full `ProductPickerOption`
   * whenever the user picks a row (or `null` on clear). Lets material-item
   * grids capture the categoryId / unit snapshot from the selection so they
   * can hydrate a parent category-filter trigger and a quantity-unit suffix
   * without an extra fetch. The `id` will always match what `onChange` gets.
   */
  onSelectOption?: (option: ProductPickerOption | null) => void
  /**
   * Category-filter scope. When set, the picker only fetches products in
   * this category. When `null` or `undefined`, the picker searches across
   * all products — the user can pick anything and the parent grid derives
   * the category from `onSelectOption`.
   */
  categoryId: string | null | undefined
  /**
   * Pre-resolved option for the current `value`. Lets the trigger render the
   * selected product's name even when it isn't in the latest server result
   * (e.g. row hydrated with a saved selection but the active search returned
   * a different page of matches).
   */
  selectedOption?: ProductPickerOption | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
}

function toDropdownOption(option: ProductPickerOption): AsyncRichDropdownOption {
  const subtitles: string[] = []
  if (option.categoryName) subtitles.push(option.categoryName)
  if (option.sendUnitAbbrev) subtitles.push(option.sendUnitAbbrev)
  return { id: option.id, title: option.name, subtitles }
}

export function ProductPicker({
  value,
  onChange,
  onSelectOption,
  categoryId,
  selectedOption: selectedFromProp = null,
  placeholder = "Select product",
  searchPlaceholder = "Search products",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
}: ProductPickerProps) {
  const filterScope = categoryId ?? null
  // Lazy-fetch: only fire the server query while the popover is open. A
  // section grid with N rows mounts 2N picker controllers; without this gate
  // each one would fan out a request on first render.
  const [isOpen, setIsOpen] = useState(false)
  const bucketKey = useMemo(() => productOptionsQueryKey(filterScope), [filterScope])
  const searchFn = useCallback(
    (query: string, signal: AbortSignal | undefined) =>
      searchProductOptionsRequest(query, signal, filterScope),
    [filterScope],
  )

  const controller = useAsyncRichDropdownController<ProductPickerOption>({
    bucketKey,
    searchFn,
    enabled: isOpen,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedDropdownOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedFromProp && selectedFromProp.id === value) {
      return toDropdownOption(selectedFromProp)
    }
    return null
  }, [selectedFromProp, value])

  const handleChange = useCallback(
    (next: string | null) => {
      onChange(next)
      if (!onSelectOption) return
      if (next === null) {
        onSelectOption(null)
        return
      }
      const fromResults = controller.options.find((option) => option.id === next)
      if (fromResults) {
        onSelectOption(fromResults)
        return
      }
      if (selectedFromProp && selectedFromProp.id === next) {
        onSelectOption(selectedFromProp)
        return
      }
      // Should be unreachable: AsyncRichDropdown only emits ids it rendered.
      onSelectOption(null)
    },
    [onChange, onSelectOption, controller.options, selectedFromProp],
  )

  return (
    <AsyncRichDropdown
      value={value}
      onChange={handleChange}
      options={options}
      selectedOption={selectedDropdownOption}
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
      onOpenChange={setIsOpen}
    />
  )
}
