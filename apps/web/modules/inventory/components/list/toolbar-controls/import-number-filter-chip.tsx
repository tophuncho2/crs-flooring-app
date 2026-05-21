"use client"

import type { ImportOption } from "@builders/domain"
import { ImportNumberPicker } from "@/modules/imports/components/picker/import-number-picker"

export type ImportNumberFilterChipProps = {
  /** Selected importNumber snapshot string (e.g. `"123"`). */
  value: string | null
  /** Pre-resolved display label (e.g. `"#IMP-123"`). */
  selectedLabel: string | null
  onChange: (next: string | null) => void
  initialOptions?: ImportOption[]
}

export function ImportNumberFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: ImportNumberFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <ImportNumberPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Import #"
        searchPlaceholder="Search import # or PO #"
        emptyMessage="No imports match"
        clearLabel="Clear filter"
        ariaLabel="Filter inventory by import number"
      />
    </div>
  )
}
