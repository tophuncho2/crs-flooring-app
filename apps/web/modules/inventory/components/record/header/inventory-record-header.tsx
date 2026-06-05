"use client"

import { useCallback, useMemo } from "react"
import { formatInventoryQuantity, type InventoryOption } from "@builders/domain"
import {
  AsyncRichDropdown,
  type AsyncRichDropdownOption,
  useAsyncRichDropdownController,
} from "@/engines/dropdowns"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
  searchInventoryOptionsRequest,
} from "@/modules/inventory/data/inventory-options-request"
import type { InventoryRecordSelectionController } from "@/modules/inventory/controllers/record/use-inventory-record-selection"

function toDropdownOption(option: InventoryOption): AsyncRichDropdownOption {
  const subtitles: string[] = []
  if (option.location && option.location.length > 0) subtitles.push(option.location)
  subtitles.push(formatInventoryQuantity(option.stockBalance, option.stockUnitAbbrev))
  return { id: option.id, title: option.inventoryItem, subtitles }
}

/**
 * The Warehouse → Inventory pickers that sit above the inventory record view's
 * sections (mirrors the templates record view's header cascade, built
 * module-local). The warehouse pick gates the inventory picker (warehouse-scoped
 * search); when the record view is opened from a work order the inventory picker
 * is further product-filtered by the WO material item's product. Selecting an
 * inventory item loads the inventory + adjustments sections below.
 */
export function InventoryRecordHeader({
  selection,
  onSelectWarehouse,
  onSelectInventory,
  onClear,
}: {
  selection: InventoryRecordSelectionController
  onSelectWarehouse: InventoryRecordSelectionController["selectWarehouse"]
  onSelectInventory: InventoryRecordSelectionController["selectInventory"]
  onClear: () => void
}) {
  const { warehouseId, warehouseLabel, inventoryId, inventoryLabel, productFilterId } = selection

  const bucketKey = useMemo(
    () => [...INVENTORY_OPTIONS_SEARCH_QUERY_KEY, warehouseId, productFilterId] as const,
    [warehouseId, productFilterId],
  )

  const pagedSearchFn = useCallback(
    (_query: string, signal: AbortSignal | undefined, skip: number) =>
      searchInventoryOptionsRequest(signal, {
        warehouseId: warehouseId ?? "",
        ...(productFilterId ? { productId: productFilterId } : {}),
        skip,
      }),
    [warehouseId, productFilterId],
  )

  const dropdown = useAsyncRichDropdownController<InventoryOption>({
    bucketKey,
    pagedSearchFn,
    enabled: warehouseId !== null,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => dropdown.options.map(toDropdownOption),
    [dropdown.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!inventoryId) return null
    return { id: inventoryId, title: inventoryLabel ?? inventoryId }
  }, [inventoryId, inventoryLabel])

  const handleInventoryChange = useCallback(
    (id: string | null) => {
      const option = id ? dropdown.options.find((o) => o.id === id) ?? null : null
      onSelectInventory(option)
    },
    [dropdown.options, onSelectInventory],
  )

  const hasSelection = warehouseId !== null || inventoryId !== null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
          Inventory item
        </span>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <WarehousePicker
          value={warehouseId}
          selectedLabel={warehouseLabel}
          onChange={() => {}}
          onOptionSelected={onSelectWarehouse}
          placeholder="Select warehouse"
          ariaLabel="Select warehouse"
        />
        <AsyncRichDropdown
          value={inventoryId}
          onChange={handleInventoryChange}
          options={options}
          selectedOption={selectedOption}
          query={dropdown.query}
          onQueryChange={dropdown.onQueryChange}
          isLoading={dropdown.isLoading || dropdown.isFetching}
          errorMessage={dropdown.errorMessage}
          placeholder="Select inventory item"
          searchPlaceholder="Search inventory"
          emptyMessage={warehouseId ? "No matches" : "Select warehouse first"}
          loadingMessage="Searching…"
          clearLabel="Clear selection"
          disabled={warehouseId === null}
          ariaLabel="Select inventory item"
          hasMore={dropdown.hasMore}
          isFetchingMore={dropdown.isFetchingMore}
          onLoadMore={dropdown.loadMore}
        />
      </div>
    </div>
  )
}
