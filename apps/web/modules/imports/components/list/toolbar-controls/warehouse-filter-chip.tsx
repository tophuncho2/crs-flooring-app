"use client"

import type { WarehouseOption } from "@builders/domain"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"

export type WarehouseFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  onOptionSelected?: (option: WarehouseOption | null) => void
  initialOptions?: WarehouseOption[]
}

/**
 * Toolbar trigger that lets the user filter the imports list by a single
 * warehouse. Renders the canonical `WarehousePicker` so the dropdown chrome +
 * server-side search is shared with every other consumer.
 */
export function WarehouseFilterChip({
  value,
  selectedLabel,
  onChange,
  onOptionSelected,
  initialOptions,
}: WarehouseFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <WarehousePicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        onOptionSelected={onOptionSelected}
        initialOptions={initialOptions}
        placeholder="Warehouse"
        searchPlaceholder="Search warehouses"
        emptyMessage="No warehouses match"
        clearLabel="Clear filter"
        ariaLabel="Filter imports by warehouse"
      />
    </div>
  )
}
