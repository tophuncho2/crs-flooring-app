"use client"

import { useCallback, useMemo } from "react"
import type { InventoryImportNumberOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/dropdowns"
import {
  INVENTORY_IMPORT_NUMBERS_SEARCH_QUERY_KEY,
  searchInventoryImportNumbersRequest,
} from "@/modules/inventory/data/inventory-import-number-options-request"

export type ImportNumberPickerProps = {
  value: string | null
  onChange: (value: string | null) => void
  /**
   * Pre-resolved label for the current `value`. Import #s have no separate id,
   * so for the picker the value IS the label — pass the same string here to
   * keep the trigger labelled before the controller fetches.
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
  initialOptions?: InventoryImportNumberOption[]
}

function toDropdownOption(option: InventoryImportNumberOption): AsyncRichDropdownOption {
  return {
    id: option.value,
    title: option.value,
  }
}

export function ImportNumberPicker({
  value,
  onChange,
  selectedLabel = null,
  placeholder = "Import #",
  searchPlaceholder = "Search Import #",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear filter",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: ImportNumberPickerProps) {
  const enabled = !disabled

  const bucketKey = useMemo(
    () => [...INVENTORY_IMPORT_NUMBERS_SEARCH_QUERY_KEY] as const,
    [],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchInventoryImportNumbersRequest(search, signal, { skip }),
    [],
  )

  const controller = useAsyncRichDropdownController<InventoryImportNumberOption>({
    bucketKey,
    pagedSearchFn,
    initialOptions,
    enabled,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    const label = selectedLabel ?? value
    return { id: value, title: label }
  }, [selectedLabel, value])

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
      // Import #s are inventory-derived — refetch on open so newly materialized
      // import numbers surface without a reload.
      onOpenChange={(isOpen) => {
        if (isOpen) controller.refetch()
      }}
    />
  )
}
