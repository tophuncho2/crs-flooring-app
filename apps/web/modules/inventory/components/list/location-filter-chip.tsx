"use client"

import { LocationPicker } from "@/modules/locations/components/picker/location-picker"

export type LocationFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  warehouseId: string | null
  sectionId: string | null
  onChange: (id: string | null) => void
}

/**
 * Inventory list-view chip — narrows by full warehouse location. Disabled
 * until a warehouse filter is set. Section filter (if active) further scopes
 * the picker results. Cascade clearing on warehouse / section change is
 * handled by the parent client.
 */
export function LocationFilterChip({
  value,
  selectedLabel,
  warehouseId,
  sectionId,
  onChange,
}: LocationFilterChipProps) {
  return (
    <div className="min-w-[13rem] max-w-[18rem]">
      <LocationPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        warehouseId={warehouseId}
        sectionId={sectionId}
        placeholder="Filter by location"
        disabledPlaceholder="Pick warehouse first"
        searchPlaceholder="Search Rx-Lx"
        emptyMessage="No locations match"
        clearLabel="Clear filter"
        ariaLabel="Filter inventory by location"
      />
    </div>
  )
}
