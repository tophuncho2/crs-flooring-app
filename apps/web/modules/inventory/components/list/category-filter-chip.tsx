"use client"

import type { CategoryOption } from "@builders/domain"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"

export type CategoryFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: CategoryOption[]
}

/**
 * Inventory list-view chip — narrows the table by category AND scopes the
 * Product chip's picker. Cascade clearing of Product on category change is
 * handled by the parent client.
 */
export function CategoryFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: CategoryFilterChipProps) {
  return (
    <div className="min-w-[12rem] max-w-[18rem]">
      <CategoryPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Filter by category"
        searchPlaceholder="Search categories"
        emptyMessage="No categories match"
        clearLabel="Clear filter"
        ariaLabel="Filter inventory by category"
      />
    </div>
  )
}
