"use client"

import { useCallback, useMemo } from "react"
import type { ImportOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  IMPORTS_OPTIONS_QUERY_KEY,
  searchImportOptionsRequest,
} from "@/modules/imports/data/imports-options-request"

export type ImportNumberPickerProps = {
  /**
   * Selected value bound to the inventory filter — the stringified `Int`
   * from `FlooringImportEntry.importNumber` (matches the inventory snapshot).
   */
  value: string | null
  onChange: (next: string | null) => void
  /**
   * Required scope — imports belong to a warehouse, so options + selection
   * are gated on a picked warehouse. Mirrors `LocationPicker` / work-order
   * picker contracts. Picker renders disabled when null.
   */
  warehouseId: string | null
  /**
   * Pre-resolved display label (`IMP-123`) so the trigger shows the chosen
   * import even when its option isn't in the latest search result.
   */
  selectedLabel?: string | null
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
  initialOptions?: ImportOption[]
}

function joinNonEmpty(...parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(" · ")
}

function toDropdownOption(option: ImportOption): AsyncRichDropdownOption {
  const subtitle = joinNonEmpty(
    option.purchaseOrderNumber ? `PO# ${option.purchaseOrderNumber}` : "",
  )
  return {
    id: option.importNumber,
    title: `#IMP-${option.importNumber}`,
    ...(subtitle ? { subtitles: [subtitle] } : {}),
  }
}

export function ImportNumberPicker({
  value,
  onChange,
  warehouseId,
  selectedLabel = null,
  placeholder = "Filter by import #",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search import # or PO #",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear filter",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: ImportNumberPickerProps) {
  const enabled = warehouseId !== null && !disabled

  const bucketKey = useMemo(
    () => [...IMPORTS_OPTIONS_QUERY_KEY, warehouseId ?? null] as const,
    [warehouseId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchImportOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        skip,
      }),
    [warehouseId],
  )

  const controller = useAsyncRichDropdownController<ImportOption>({
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
    if (selectedLabel) return { id: value, title: selectedLabel }
    return { id: value, title: `#IMP-${value}` }
  }, [selectedLabel, value])

  return (
    <AsyncRichDropdown
      value={value}
      onChange={onChange}
      options={options}
      selectedOption={selectedOption}
      query={controller.query}
      onQueryChange={controller.onQueryChange}
      isLoading={controller.isLoading}
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
      hasMore={controller.hasMore}
      isFetchingMore={controller.isFetchingMore}
      onLoadMore={controller.loadMore}
    />
  )
}
