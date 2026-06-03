"use client"

import type { JobTypeOption } from "@builders/domain"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"

export type JobTypeFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: JobTypeOption[]
}

/**
 * Work-order list-view chip — narrows the table to a single job type.
 */
export function JobTypeFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: JobTypeFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <JobTypePicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Job type"
        searchPlaceholder="Search job types"
        emptyMessage="No job types match"
        clearLabel="Clear filter"
        ariaLabel="Filter work orders by job type"
      />
    </div>
  )
}
