"use client"

import { ChevronDown } from "lucide-react"

/**
 * Placeholder chip for a Job Type picker. Visual matches the closed-state
 * trigger of `AsyncRichDropdown` so the toolbar reads as a full grid of
 * controls even before the properties list filter accepts a job type.
 * Replace with a real picker wrapper (e.g. `<JobTypePicker .../>`) once
 * the list-view filter contract is extended.
 */
export function JobTypeFilterChip() {
  return (
    <button
      type="button"
      disabled
      aria-label="Filter properties by job type (coming soon)"
      className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)]/55 outline-none transition disabled:cursor-not-allowed"
    >
      <span>Job Type</span>
      <ChevronDown size={16} className="shrink-0 text-[var(--foreground)]/40" />
    </button>
  )
}
