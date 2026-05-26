"use client"

import { formatInventoryQuantity } from "@builders/domain"
import {
  HubSidePanelScopedRow,
  HubSidePanelScrollList,
} from "@/components/hub-side-panel"
import { SearchControl } from "@/components/features/search"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { LocationPicker } from "@/modules/inventory/components/picker/location-picker"
import type { InventoryHubStartingController } from "@/modules/inventory/controllers/inventory-hub-starting/use-inventory-hub-starting-controller"

const PICKER_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

function rowSecondary(
  location: string | null,
  stock: string,
  stockUnit: string,
): string {
  const parts: string[] = []
  if (location && location.length > 0) parts.push(location)
  parts.push(formatInventoryQuantity(stock, stockUnit))
  return parts.join(" · ")
}

/**
 * Body for the inventory-hub starting-spot cascade. Warehouse → category &
 * product → optional location; once all three of warehouse/category/product
 * are chosen, the matching inventory rows render below as an infinite-scroll
 * list. Clicking a row enters the hub view for that inventory. Mirrors the
 * template-sync cascade's role for the property hub.
 */
export function InventoryHubStartingBody({
  controller,
}: {
  controller: InventoryHubStartingController
}) {
  const {
    warehouseId,
    warehouseLabel,
    selectWarehouse,
    categoryId,
    categoryLabel,
    selectCategory,
    productId,
    productLabel,
    selectProduct,
    location,
    selectLocation,
    search,
    onSearchChange,
    listReady,
    list,
    openInventoryView,
  } = controller

  const { rows, hasData, isEmpty, isError, hasMore, isFetchingMore, loadMore } = list

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={PICKER_LABEL_CLASS}>Warehouse</span>
          <WarehousePicker
            value={warehouseId}
            selectedLabel={warehouseLabel}
            onChange={() => {}}
            onOptionSelected={selectWarehouse}
            placeholder="Select warehouse"
            ariaLabel="Inventory hub warehouse filter"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={PICKER_LABEL_CLASS}>Category</span>
          <CategoryPicker
            value={categoryId}
            selectedLabel={categoryLabel}
            onChange={() => {}}
            onOptionSelected={selectCategory}
            disabled={warehouseId === null}
            placeholder={warehouseId === null ? "Select warehouse first" : "Select category"}
            ariaLabel="Inventory hub category filter"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={PICKER_LABEL_CLASS}>Product</span>
          <ProductPicker
            value={productId}
            selectedLabel={productLabel}
            categoryId={categoryId}
            onChange={() => {}}
            onOptionSelected={selectProduct}
            disabled={categoryId === null}
            placeholder={categoryId === null ? "Select category first" : "Select product"}
            ariaLabel="Inventory hub product filter"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={PICKER_LABEL_CLASS}>Location (optional)</span>
          <LocationPicker
            value={location}
            onChange={selectLocation}
            warehouseId={warehouseId}
            selectedLabel={location}
            placeholder="Any location"
            disabledPlaceholder="Select warehouse first"
            ariaLabel="Inventory hub location filter"
          />
        </label>
      </div>

      {listReady ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="shrink-0">
            <SearchControl
              query={search}
              onQueryChange={onSearchChange}
              placeholder="Search inventory item"
            />
          </div>
          <div className="min-h-0 flex-1">
            <HubSidePanelScrollList
              title="Inventory"
              hasData={hasData}
              isEmpty={isEmpty}
              isError={isError}
              errorMessage="Could not load inventory."
              loadingMessage="Loading inventory…"
              emptyMessage="No inventory matches these filters."
              hasMore={hasMore}
              isFetchingMore={isFetchingMore}
              onLoadMore={loadMore}
            >
              {rows.map((row) => (
                <HubSidePanelScopedRow
                  key={row.id}
                  primary={row.inventoryItem}
                  secondary={rowSecondary(row.location, row.stockBalance, row.stockUnitAbbrev)}
                  onClick={() => openInventoryView(row.id)}
                  ariaLabel={`Open inventory ${row.inventoryItem}`}
                />
              ))}
            </HubSidePanelScrollList>
          </div>
        </div>
      ) : (
        <p className="px-1 text-sm text-[var(--foreground)]/55">
          Select a warehouse, category, and product to view matching inventory.
        </p>
      )}
    </div>
  )
}
