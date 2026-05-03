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
 * Toolbar trigger that lets the user filter the products list by a single
 * category. Renders the canonical `CategoryPicker` so the dropdown chrome +
 * server-side search is shared with every other consumer.
 */
export function CategoryFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: CategoryFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <CategoryPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Filter by category"
        searchPlaceholder="Search categories"
        emptyMessage="No categories match"
        clearLabel="Clear filter"
        ariaLabel="Filter products by category"
      />
    </div>
  )
}
