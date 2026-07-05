"use client"

import { useCallback, useMemo } from "react"
import type { InventoryImportNumberOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
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

  // Value IS the import number; fall back to it when no label is supplied.
  const resolvedSelectedLabel = value !== null ? selectedLabel ?? value : selectedLabel

  return (
    <AsyncOptionPicker<InventoryImportNumberOption>
      value={value}
      onChange={onChange}
      selectedLabel={resolvedSelectedLabel}
      bucketKey={bucketKey}
      pagedSearchFn={pagedSearchFn}
      toOption={toDropdownOption}
      initialOptions={initialOptions}
      enabled={enabled}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
      // Import #s are inventory-derived — refetch on open so newly materialized
      // import numbers surface without a reload.
      refetchOnOpen
    />
  )
}
