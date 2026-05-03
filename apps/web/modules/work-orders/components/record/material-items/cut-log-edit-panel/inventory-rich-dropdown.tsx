"use client"

import { useMemo } from "react"
import { RichDropdown } from "@/components/dropdowns/rich-dropdown/rich-dropdown"
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
 * surfaces inventoryNumber as the option title with itemNumber / dyeLot /
 * notes as searchable subtitles. Filtering is the dropdown's built-in
 * substring match — server-side search lands in a later sweep.
 */
export function InventoryRichDropdown({
  value,
  onChange,
  inventories,
  disabled,
  isLoading,
  ariaLabel,
}: InventoryRichDropdownProps) {
  const dropdownOptions = useMemo(
    () =>
      inventories.map((inv) => ({
        id: inv.id,
        title: inv.inventoryNumber,
        subtitles: [
          `${inv.remainingStock} ${inv.stockUnitAbbrev}`,
          inv.itemNumber || undefined,
          inv.dyeLot || undefined,
          inv.notes || undefined,
        ].filter((part): part is string => Boolean(part)),
      })),
    [inventories],
  )

  return (
    <RichDropdown
      value={value}
      onChange={onChange}
      options={dropdownOptions}
      placeholder={isLoading ? "Loading inventory…" : "Select inventory"}
      searchPlaceholder="Search by number, item, dye lot, notes…"
      emptyMessage={isLoading ? "Loading…" : "No matching inventory"}
      disabled={disabled || isLoading}
      ariaLabel={ariaLabel ?? "Inventory selector"}
    />
  )
}
