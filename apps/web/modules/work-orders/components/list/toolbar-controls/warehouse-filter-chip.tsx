"use client"

import type { WarehouseOption } from "@builders/domain"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"

export type WarehouseFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: WarehouseOption[]
}

/**
 * Work-order list-view chip — narrows the table to a single warehouse.
 */
export function WarehouseFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: WarehouseFilterChipProps) {
  return (
    <WarehousePicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      initialOptions={initialOptions}
      placeholder="Warehouse"
      searchPlaceholder="Search warehouses"
      emptyMessage="No warehouses match"
      clearLabel="Clear filter"
      ariaLabel="Filter work orders by warehouse"
    />
  )
}
