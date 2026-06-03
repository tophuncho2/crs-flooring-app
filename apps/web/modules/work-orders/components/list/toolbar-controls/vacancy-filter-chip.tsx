"use client"

import type { DropdownOption } from "@/components/dropdowns/contracts/dropdown-option"
import { SelectDropdown } from "@/components/dropdowns/select-dropdown"

export type VacancyFilterChipProps = {
  value: string | null
  onChange: (value: string | null) => void
}

// Static enum — the work order's vacancy column is `VACANT` / `OCCUPIED`.
const VACANCY_OPTIONS: ReadonlyArray<DropdownOption> = [
  { id: "VACANT", label: "Vacant" },
  { id: "OCCUPIED", label: "Occupied" },
]

/**
 * Work-order list-view chip — narrows the table to a single vacancy state.
 * Static two-option dropdown (no async picker); `allowClear` turns the filter
 * off, which is also the default when nothing is selected.
 */
export function VacancyFilterChip({ value, onChange }: VacancyFilterChipProps) {
  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={VACANCY_OPTIONS}
      allowClear
      placeholder="Vacancy"
      ariaLabel="Filter work orders by vacancy"
    />
  )
}
