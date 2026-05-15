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
 * Properties list-view chip — narrows the table to a single management
 * company. Renders the canonical `ManagementCompanyPicker` so the
 * dropdown chrome + server-side search is shared with every other consumer.
 */
export function ManagementCompanyFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: ManagementCompanyFilterChipProps) {
  return (
    <ManagementCompanyPicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      initialOptions={initialOptions}
      placeholder="Management company"
      searchPlaceholder="Search companies"
      emptyMessage="No companies match"
      clearLabel="Clear filter"
      ariaLabel="Filter properties by management company"
    />
  )
}
