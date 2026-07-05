"use client"

import { useCallback, useMemo } from "react"
import type { ImportOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  IMPORTS_OPTIONS_QUERY_KEY,
  searchImportOptionsRequest,
} from "@/modules/imports/data/imports-options-request"

export type ImportNumberPickerProps = {
  /**
   * Selected value bound to the inventory filter — the stringified `Int`
   * from `FlooringImportEntry.importNumber` (the value the inventory list's
   * import# filter resolves through the import-entry link).
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

  // Value IS the import number; fall back to a formatted label when no
  // pre-resolved label is supplied so the trigger stays labelled.
  const resolvedSelectedLabel =
    value !== null ? selectedLabel ?? `#IMP-${value}` : selectedLabel

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
