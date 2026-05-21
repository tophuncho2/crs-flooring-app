"use client"

import { useCallback, useMemo } from "react"
import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  INVENTORY_PURCHASE_ORDER_OPTIONS_QUERY_KEY,
  searchInventoryPurchaseOrderOptionsRequest,
} from "@/modules/inventory/data/inventory-purchase-order-options-request"

export type InventoryPurchaseOrderPickerProps = {
  /**
   * Selected value bound to the inventory filter — the
   * `purchaseOrderNumber` snapshot string on `flooring_inventory`.
   */
  value: string | null
  onChange: (next: string | null) => void
  /**
   * Required scope — inventory rows belong to a warehouse. Picker renders
   * disabled when null.
   */
  warehouseId: string | null
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
  initialOptions?: InventoryPurchaseOrderOption[]
}

function toDropdownOption(
  option: InventoryPurchaseOrderOption,
): AsyncRichDropdownOption {
  return {
    id: option.purchaseOrderNumber,
    title: `PO# ${option.purchaseOrderNumber}`,
  }
}

export function InventoryPurchaseOrderPicker({
  value,
  onChange,
  warehouseId,
  isArchived,
  placeholder = "Filter by PO #",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search PO #",
  emptyMessage = "No POs match",
  loadingMessage = "Searching…",
  clearLabel = "Clear filter",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: InventoryPurchaseOrderPickerProps) {
  const enabled = warehouseId !== null && !disabled

  const bucketKey = useMemo(
    () =>
      [
        ...INVENTORY_PURCHASE_ORDER_OPTIONS_QUERY_KEY,
        warehouseId ?? null,
        isArchived ?? null,
      ] as const,
    [warehouseId, isArchived],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchInventoryPurchaseOrderOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        ...(isArchived !== undefined ? { isArchived } : {}),
      }),
    [warehouseId, isArchived],
  )

  const controller = useAsyncRichDropdownController<InventoryPurchaseOrderOption>({
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
    return { id: value, title: `PO# ${value}` }
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
