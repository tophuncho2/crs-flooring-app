"use client"

import { useMemo, useState } from "react"
import { RichDropdown } from "@/components/dropdowns/rich-dropdown/rich-dropdown"
import { SelectDropdown } from "@/components/dropdowns/select-dropdown"
import type { EligibleInventoryRow } from "@/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel"

export type InventoryRichDropdownProps = {
  value: string | null
  onChange: (value: string | null) => void
  inventories: ReadonlyArray<EligibleInventoryRow>
  disabled?: boolean
  isLoading?: boolean
  ariaLabel?: string
}

/**
 * Inventory selector for the cut-log edit panel. Wraps `RichDropdown` and
 * adds two collapsible filter slots above its option list — Section and
 * Location. Filters are mutually exclusive (picking one clears the other),
 * matching the data layer's two-tier breakdown for inventory locations.
 *
 * Filtering is client-side over the eligible-inventory array passed in;
 * server-side search lands in a later sweep once the project is ready.
 */
export function InventoryRichDropdown({
  value,
  onChange,
  inventories,
  disabled,
  isLoading,
  ariaLabel,
}: InventoryRichDropdownProps) {
  const [sectionFilter, setSectionFilter] = useState<string | null>(null)
  const [locationFilter, setLocationFilter] = useState<string | null>(null)

  const sectionOptions = useMemo(
    () =>
      Array.from(new Set(inventories.map((i) => i.sectionCode).filter(Boolean)))
        .sort()
        .map((code) => ({ id: code, label: code })),
    [inventories],
  )
  const locationOptions = useMemo(
    () =>
      Array.from(new Set(inventories.map((i) => i.locationCode).filter(Boolean)))
        .sort()
        .map((code) => ({ id: code, label: code })),
    [inventories],
  )

  const visibleInventories = useMemo(() => {
    if (sectionFilter) return inventories.filter((i) => i.sectionCode === sectionFilter)
    if (locationFilter) return inventories.filter((i) => i.locationCode === locationFilter)
    return inventories
  }, [inventories, sectionFilter, locationFilter])

  const dropdownOptions = useMemo(
    () =>
      visibleInventories.map((inv) => ({
        id: inv.id,
        title: inv.inventoryNumber,
        subtitles: [
          `${inv.remainingStock} ${inv.stockUnitAbbrev}`,
          inv.locationCode,
          inv.itemNumber || undefined,
          inv.dyeLot || undefined,
        ].filter((part): part is string => Boolean(part)),
      })),
    [visibleInventories],
  )

  function handleSectionChange(next: string | null) {
    setSectionFilter(next)
    if (next) setLocationFilter(null)
  }

  function handleLocationChange(next: string | null) {
    setLocationFilter(next)
    if (next) setSectionFilter(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--foreground)]/55">
            Filter by section
          </span>
          <SelectDropdown
            value={sectionFilter}
            onChange={handleSectionChange}
            options={sectionOptions}
            allowClear
            placeholder="All sections"
            disabled={disabled || !!locationFilter}
            ariaLabel="Inventory section filter"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--foreground)]/55">
            Filter by location
          </span>
          <SelectDropdown
            value={locationFilter}
            onChange={handleLocationChange}
            options={locationOptions}
            allowClear
            placeholder="All locations"
            disabled={disabled || !!sectionFilter}
            ariaLabel="Inventory location filter"
          />
        </div>
      </div>
      <RichDropdown
        value={value}
        onChange={onChange}
        options={dropdownOptions}
        placeholder={isLoading ? "Loading inventory…" : "Select inventory"}
        searchPlaceholder="Search by number, location, item…"
        emptyMessage={isLoading ? "Loading…" : "No matching inventory"}
        disabled={disabled || isLoading}
        ariaLabel={ariaLabel ?? "Inventory selector"}
      />
    </div>
  )
}
