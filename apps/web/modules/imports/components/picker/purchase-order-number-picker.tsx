"use client"

import { useCallback, useMemo } from "react"
import type { ImportOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
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
  /**
   * Required scope — imports belong to a warehouse, so PO options come from
   * imports in that warehouse only. Picker renders disabled when null.
   */
  warehouseId: string | null
  /** Pre-resolved display label (`PO# ABC-123`) for the trigger. */
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

function toDropdownOption(option: ImportOption): AsyncRichDropdownOption | null {
  // Imports may have a blank PO; skip those so the chip never lets you pick
  // a value that would filter inventory by `purchaseOrderNumber = ''`. The
  // base dedupes by id, so repeats of the same PO across imports collapse.
  if (!option.purchaseOrderNumber) return null
  const subtitle = joinNonEmpty(`#IMP-${option.importNumber}`)
  return {
    id: option.purchaseOrderNumber,
    title: `PO# ${option.purchaseOrderNumber}`,
    ...(subtitle ? { subtitles: [subtitle] } : {}),
  }
}

export function PurchaseOrderNumberPicker({
  value,
  onChange,
  warehouseId,
  selectedLabel = null,
  placeholder = "Filter by PO #",
  disabledPlaceholder = "Select warehouse first",
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

  // Value IS the PO number; fall back to a formatted label when none supplied.
  const resolvedSelectedLabel =
    value !== null ? selectedLabel ?? `PO# ${value}` : selectedLabel

  return (
    <AsyncOptionPicker<ImportOption>
      value={value}
      onChange={onChange}
      selectedLabel={resolvedSelectedLabel}
      bucketKey={bucketKey}
      pagedSearchFn={pagedSearchFn}
      toOption={toDropdownOption}
      initialOptions={initialOptions}
      enabled={enabled}
      placeholder={placeholder}
      disabledPlaceholder={disabledPlaceholder}
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
