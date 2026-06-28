"use client"

import { SegmentedChoiceCell, type SegmentedChoiceOption } from "@/engines/record-view"

// Active = light green (success tone), Archived = caution yellow (warning tone)
// — same segmented-cell palette as the work-orders Time of Day / Vacancy fields.
const ARCHIVE_OPTIONS: ReadonlyArray<SegmentedChoiceOption> = [
  { value: "ACTIVE", label: "Active", tone: "success" },
  { value: "ARCHIVED", label: "Archived", tone: "warning" },
]

/**
 * Archive-status control in the Stock group header. A thin boolean↔string
 * wrapper over `SegmentedChoiceCell`: editable renders the two-segment pill
 * (selected segment fills with its tone); when disabled it collapses to the
 * static `StatusBadge` of the selected option. The `isArchived` boolean never
 * leaves this component — the ACTIVE/ARCHIVED strings are local mapping only.
 */
export function InventoryArchiveChip({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (next: boolean) => void
  disabled: boolean
}) {
  return (
    <div className="w-full">
      <SegmentedChoiceCell
        editable={!disabled}
        value={value ? "ARCHIVED" : "ACTIVE"}
        options={ARCHIVE_OPTIONS}
        ariaLabel="Archive status"
        onChange={(next) => onChange(next === "ARCHIVED")}
      />
    </div>
  )
}
