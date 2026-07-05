"use client"

import { useCallback, useMemo } from "react"
import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  INVENTORY_PURCHASE_ORDERS_SEARCH_QUERY_KEY,
  searchInventoryPurchaseOrderNumbersRequest,
} from "@/modules/inventory/data/inventory-purchase-order-options-request"

export type PurchaseOrderPickerProps = {
  value: string | null
  onChange: (value: string | null) => void
  /**
   * Pre-resolved label for the current `value`. PO#s have no separate id, so
   * for the picker the value IS the label — pass the same string here to keep
   * the trigger labelled before the controller fetches.
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
  initialOptions?: InventoryPurchaseOrderOption[]
}

function toDropdownOption(option: InventoryPurchaseOrderOption): AsyncRichDropdownOption {
  return {
    id: option.value,
    title: option.value,
  }
}

export function PurchaseOrderPicker({
  value,
  onChange,
  selectedLabel = null,
  placeholder = "Import PO#",
  searchPlaceholder = "Search PO#",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear filter",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: PurchaseOrderPickerProps) {
  const enabled = !disabled

  const bucketKey = useMemo(
    () => [...INVENTORY_PURCHASE_ORDERS_SEARCH_QUERY_KEY] as const,
    [],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchInventoryPurchaseOrderNumbersRequest(search, signal, { skip }),
    [],
  )

  // Value IS the PO number; fall back to it when no label is supplied.
  const resolvedSelectedLabel = value !== null ? selectedLabel ?? value : selectedLabel

  return (
    <AsyncOptionPicker<InventoryPurchaseOrderOption>
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
      // PO#s are inventory-derived — refetch on open so newly materialized
      // import PO#s surface without a reload.
      refetchOnOpen
    />
  )
}
