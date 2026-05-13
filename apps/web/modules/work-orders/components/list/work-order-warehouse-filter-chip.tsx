"use client"

import type { WarehouseOption } from "@builders/domain"
import { PickerFilterChip } from "@/components/features/filter"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"

export type WorkOrderWarehouseFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: WarehouseOption[]
}

export function WorkOrderWarehouseFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: WorkOrderWarehouseFilterChipProps) {
  return (
    <PickerFilterChip>
      <WarehousePicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Filter by warehouse"
        searchPlaceholder="Search warehouses"
        emptyMessage="No warehouses match"
        clearLabel="Clear filter"
        ariaLabel="Filter work orders by warehouse"
      />
    </PickerFilterChip>
  )
}
