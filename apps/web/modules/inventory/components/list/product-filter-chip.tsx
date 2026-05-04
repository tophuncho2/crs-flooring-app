"use client"

import { ProductPicker } from "@/modules/products/components/picker/product-picker"

export type ProductFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  /** Optional category scope — when set, the picker narrows to that category. */
  categoryId: string | null
  onChange: (id: string | null) => void
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
}: ProductFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <ProductPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        categoryId={categoryId}
        placeholder="Filter by product"
        searchPlaceholder="Search products"
        emptyMessage="No products match"
        clearLabel="Clear filter"
        ariaLabel="Filter inventory by product"
      />
    </div>
  )
}
