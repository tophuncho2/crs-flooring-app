"use client"

import type { ManagementCompanyOption } from "@builders/domain"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"

export type MgmtCoFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: ManagementCompanyOption[]
}

/**
 * Work-order list-view chip — narrows the table to a single management
 * company AND scopes the Property chip's picker. Cascade clearing of
 * Property + Template on mgmt-co change is handled by the parent client.
 */
export function MgmtCoFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: MgmtCoFilterChipProps) {
  return (
    <div className="min-w-[12rem] max-w-[18rem]">
      <ManagementCompanyPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Mgmt co"
        searchPlaceholder="Search companies"
        emptyMessage="No companies match"
        clearLabel="Clear filter"
        ariaLabel="Filter work orders by management company"
      />
    </div>
  )
}
