"use client"

import { useCallback, useMemo } from "react"
import type { InventoryImportNumberOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  INVENTORY_IMPORT_NUMBER_OPTIONS_QUERY_KEY,
  searchInventoryImportNumberOptionsRequest,
} from "@/modules/inventory/data/inventory-import-number-options-request"

export type InventoryImportNumberPickerProps = {
  /**
   * Selected value bound to the inventory filter — the `importNumber`
   * snapshot string on `flooring_inventory` (matches the column the chip
   * filters on).
   */
  value: string | null
  onChange: (next: string | null) => void
  /**
   * Required scope — inventory rows belong to a warehouse, so options +
   * selection are gated on a picked warehouse. Picker renders disabled when
   * null.
   */
  warehouseId: string | null
  /**
   * Optional archive scope — mirrors the inventory list view's archive
   * segmented control so the chip surfaces only import #'s with at least one
   * inventory row in the same scope.
   */
  isArchived?: boolean
  placeholder?: string
  disabledPlaceholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  initialOptions?: InventoryImportNumberOption[]
}

function toDropdownOption(option: InventoryImportNumberOption): AsyncRichDropdownOption {
  return {
    id: option.importNumber,
    title: `#IMP-${option.importNumber}`,
  }
}

export function InventoryImportNumberPicker({
  value,
  onChange,
  warehouseId,
  isArchived,
  placeholder = "Filter by import #",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search import #",
  emptyMessage = "No imports match",
  loadingMessage = "Searching…",
  clearLabel = "Clear filter",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: InventoryImportNumberPickerProps) {
  const enabled = warehouseId !== null && !disabled

  const bucketKey = useMemo(
    () =>
      [
        ...INVENTORY_IMPORT_NUMBER_OPTIONS_QUERY_KEY,
        warehouseId ?? null,
        isArchived ?? null,
      ] as const,
    [warehouseId, isArchived],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchInventoryImportNumberOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        ...(isArchived !== undefined ? { isArchived } : {}),
      }),
    [warehouseId, isArchived],
  )

  const controller = useAsyncRichDropdownController<InventoryImportNumberOption>({
    bucketKey,
    searchFn,
    initialOptions,
    enabled,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    return { id: value, title: `#IMP-${value}` }
  }, [value])

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
      placeholder={enabled ? placeholder : disabledPlaceholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled || warehouseId === null}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
