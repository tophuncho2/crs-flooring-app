"use client"

import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"

export type ManagementCompanyFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
}

/**
 * Toolbar trigger that lets the user filter the properties list by a single
 * management company. Renders the canonical `ManagementCompanyPicker` so the
 * dropdown chrome + server-side search is shared with every other consumer.
 */
export function ManagementCompanyFilterChip({
  value,
  selectedLabel,
  onChange,
}: ManagementCompanyFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <ManagementCompanyPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        placeholder="Filter by company"
        searchPlaceholder="Search companies"
        emptyMessage="No companies match"
        clearLabel="Clear filter"
        ariaLabel="Filter properties by management company"
      />
    </div>
  )
}
