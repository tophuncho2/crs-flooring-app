"use client"

import type { CategoryOption } from "@builders/domain"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"

export type CategoryFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  onOptionSelected?: (option: CategoryOption | null) => void
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
  onOptionSelected,
  initialOptions,
}: CategoryFilterChipProps) {
  return (
    <CategoryPicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      initialOptions={initialOptions}
      placeholder="Category"
      searchPlaceholder="Search categories"
      emptyMessage="No categories match"
      clearLabel="Clear filter"
      ariaLabel="Filter inventory by category"
    />
  )
}
