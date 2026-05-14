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
 * Inventory list-view chip — narrows the table to a single warehouse and
 * gates the Section + Location chips (those are disabled until a warehouse is
 * picked, matching the LocationPicker contract).
 */
export function WarehouseFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: WarehouseFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <WarehousePicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Warehouse"
        searchPlaceholder="Search warehouses"
        emptyMessage="No warehouses match"
        clearLabel="Clear filter"
        ariaLabel="Filter inventory by warehouse"
      />
    </div>
  )
}
