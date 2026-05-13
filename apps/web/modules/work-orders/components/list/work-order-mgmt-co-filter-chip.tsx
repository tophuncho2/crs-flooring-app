"use client"

import type { ManagementCompanyOption } from "@builders/domain"
import { PickerFilterChip } from "@/components/features/filter"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"

export type WorkOrderMgmtCoFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: ManagementCompanyOption[]
}

export function WorkOrderMgmtCoFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: WorkOrderMgmtCoFilterChipProps) {
  return (
    <PickerFilterChip>
      <ManagementCompanyPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Filter by mgmt co"
        searchPlaceholder="Search companies"
        emptyMessage="No companies match"
        clearLabel="Clear filter"
        ariaLabel="Filter work orders by management company"
      />
    </PickerFilterChip>
  )
}
