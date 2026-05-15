"use client"

import type { ManagementCompanyOption } from "@builders/domain"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"

export type ManagementCompanyFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: ManagementCompanyOption[]
}

/**
 * Templates list-view chip — narrows the table by management company AND
 * scopes the Property chip's picker. Cascade clearing of Property on MC
 * change is handled by the parent client.
 */
export function ManagementCompanyFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: ManagementCompanyFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <ManagementCompanyPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Filter by company"
        searchPlaceholder="Search companies"
        emptyMessage="No companies match"
        clearLabel="Clear filter"
        ariaLabel="Filter templates by management company"
      />
    </div>
  )
}
