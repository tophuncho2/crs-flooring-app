"use client"

import type { ProductOption } from "@builders/domain"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"

export type ProductFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  /** Optional category scope — when set, the picker narrows to that category. */
  categoryId: string | null
  onChange: (id: string | null) => void
  onOptionSelected?: (option: ProductOption | null) => void
}

/**
 * Inventory list-view chip — narrows the table to a single product. The
 * Category chip (if active) scopes the picker's search results, but Product
 * is also independently filterable on the table without a category set.
 */
export function ProductFilterChip({
  value,
  selectedLabel,
  categoryId,
  onChange,
  onOptionSelected,
}: ProductFilterChipProps) {
  return (
    <ProductPicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      categoryId={categoryId}
      placeholder="Product"
      searchPlaceholder="Search products"
      emptyMessage="No products match"
      clearLabel="Clear filter"
      ariaLabel="Filter inventory by product"
    />
  )
}
