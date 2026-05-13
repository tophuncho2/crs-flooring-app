"use client"

import { EnumFilterChip } from "@/components/features/filter"

export const WORK_ORDER_COMPLETE_FILTER_OPTIONS = [
  { value: "hide", label: "Hide complete" },
  { value: "only", label: "Completed only" },
  { value: "all", label: "Show all" },
] as const

export type WorkOrderCompleteFilterValue =
  (typeof WORK_ORDER_COMPLETE_FILTER_OPTIONS)[number]["value"]

export type WorkOrderCompleteFilterChipProps = {
  value: WorkOrderCompleteFilterValue
  onChange: (next: WorkOrderCompleteFilterValue) => void
}

export function WorkOrderCompleteFilterChip({
  value,
  onChange,
}: WorkOrderCompleteFilterChipProps) {
  return (
    <EnumFilterChip
      label="Status"
      value={value}
      options={WORK_ORDER_COMPLETE_FILTER_OPTIONS}
      onChange={(next) => onChange(next as WorkOrderCompleteFilterValue)}
      ariaLabel="Filter work orders by completion status"
    />
  )
}
