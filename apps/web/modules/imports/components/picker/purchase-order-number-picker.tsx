"use client"

import { useMemo } from "react"
import type { ImportOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  IMPORTS_OPTIONS_QUERY_KEY,
  searchImportOptionsRequest,
} from "@/modules/imports/data/imports-options-request"

export type PurchaseOrderNumberPickerProps = {
  /**
   * Selected value bound to the inventory filter — the
   * `purchaseOrderNumber` string snapshot on `flooring_inventory` (mirrors
   * the column on `FlooringImportEntry`).
   */
  value: string | null
  onChange: (next: string | null) => void
  /** Pre-resolved display label (`PO# ABC-123`) for the trigger. */
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
  initialOptions?: ImportOption[]
}

function joinNonEmpty(...parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(" · ")
}

function toDropdownOption(option: ImportOption): AsyncRichDropdownOption | null {
  // Imports may have a blank PO; skip those so the chip never lets you pick
  // a value that would filter inventory by `purchaseOrderNumber = ''`.
  if (!option.purchaseOrderNumber) return null
  const subtitle = joinNonEmpty(`#IMP-${option.importNumber}`, option.warehouseName)
  return {
    id: option.purchaseOrderNumber,
    title: `PO# ${option.purchaseOrderNumber}`,
    ...(subtitle ? { subtitles: [subtitle] } : {}),
  }
}

export function PurchaseOrderNumberPicker({
  value,
  onChange,
  selectedLabel = null,
  placeholder = "Filter by PO #",
  searchPlaceholder = "Search PO # or import #",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear filter",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: PurchaseOrderNumberPickerProps) {
  const controller = useAsyncRichDropdownController<ImportOption>({
    bucketKey: IMPORTS_OPTIONS_QUERY_KEY,
    searchFn: searchImportOptionsRequest,
    initialOptions,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(() => {
    const out: AsyncRichDropdownOption[] = []
    const seen = new Set<string>()
    for (const option of controller.options) {
      const mapped = toDropdownOption(option)
      if (!mapped) continue
      if (seen.has(mapped.id)) continue
      seen.add(mapped.id)
      out.push(mapped)
    }
    return out
  }, [controller.options])

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedLabel) return { id: value, title: selectedLabel }
    return { id: value, title: `PO# ${value}` }
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
    />
  )
}
