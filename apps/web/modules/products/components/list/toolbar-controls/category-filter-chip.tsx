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

export function CategoryFilterChip({
  value,
  selectedLabel,
  onChange,
  onOptionSelected,
  initialOptions,
}: CategoryFilterChipProps) {
  return (
    <div className="min-w-[12rem] max-w-[18rem]">
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
        ariaLabel="Filter products by category"
      />
    </div>
  )
}
