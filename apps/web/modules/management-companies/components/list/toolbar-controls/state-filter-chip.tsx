"use client"

import type { ManagementCompanyStateOption } from "@builders/domain"
import { ManagementCompanyStatePicker } from "@/modules/management-companies/components/picker/management-company-state-picker"

export type StateFilterChipProps = {
  value: string | null
  onChange: (value: string | null) => void
  initialOptions?: ManagementCompanyStateOption[]
}

/**
 * Management companies list-view chip — narrows the table to a single state
 * code. State values are derived via `SELECT DISTINCT state` over
 * flooring_management_company, so the dropdown never shows duplicates.
 */
export function StateFilterChip({
  value,
  onChange,
  initialOptions,
}: StateFilterChipProps) {
  return (
    <div className="min-w-[8rem] max-w-[12rem]">
      <ManagementCompanyStatePicker
        value={value}
        selectedLabel={value}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="State"
        searchPlaceholder="Search state"
        emptyMessage="No states match"
        clearLabel="Clear filter"
        ariaLabel="Filter management companies by state"
      />
    </div>
  )
}
