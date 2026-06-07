"use client"

import { useCallback, useMemo } from "react"
import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
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

  const controller = useAsyncRichDropdownController<InventoryPurchaseOrderOption>({
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
      // PO#s are inventory-derived — refetch on open so newly materialized
      // import PO#s surface without a reload.
      onOpenChange={(isOpen) => {
        if (isOpen) controller.refetch()
      }}
    />
  )
}
