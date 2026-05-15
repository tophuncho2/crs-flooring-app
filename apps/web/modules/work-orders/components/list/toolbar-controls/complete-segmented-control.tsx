"use client"

export type CompleteSegmentedControlValue = "hide" | "only" | "all"

export const COMPLETE_SEGMENTED_DEFAULT: CompleteSegmentedControlValue = "hide"

export type CompleteSegmentedControlProps = {
  value: CompleteSegmentedControlValue
  onChange: (next: CompleteSegmentedControlValue) => void
}

const SEGMENTS: Array<{ key: string; label: string; value: CompleteSegmentedControlValue }> = [
  { key: "hide", label: "Active", value: "hide" },
  { key: "only", label: "Complete", value: "only" },
  { key: "all", label: "All", value: "all" },
]

/**
 * Work-order list-view segmented control replacing the prior single-button
 * "Hide complete" enum chip. Three mutually-exclusive states:
 *   - Active   → `value === "hide"` (filter absent — default)
 *   - Complete → `value === "only"` (URL `isComplete=only`)
 *   - All      → `value === "all"`  (URL `isComplete=all`)
 *
 * Designed to live inside a `ListToolbarTallCard` labelled "Status".
 */
export function CompleteSegmentedControl({
  value,
  onChange,
}: CompleteSegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Work order completion status"
      className="inline-flex w-full items-stretch rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-0.5"
    >
      {SEGMENTS.map((segment) => {
        const isActive = value === segment.value
        return (
          <button
            key={segment.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(segment.value)}
            className={[
              "flex-1 rounded px-2 py-1 text-xs font-medium transition",
              isActive
                ? "bg-blue-500/15 text-blue-700"
                : "text-[var(--foreground)]/70 hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
