"use client"

export type ArchiveSegmentedControlProps = {
  /** `false` = Active only, `true` = Archived only. */
  value: boolean
  onChange: (next: boolean) => void
}

const SEGMENTS: Array<{ key: string; label: string; value: boolean }> = [
  { key: "active", label: "Active", value: false },
  { key: "archived", label: "Archived", value: true },
]

/**
 * List-view segmented control replacing the prior single-button "Hide archived"
 * chip. Two mutually-exclusive states; the list defaults to Active:
 *   - Active    → `value === false`  (URL `archived=false` / absent)
 *   - Archived  → `value === true`   (URL `archived=true`)
 *
 * Designed to live inside the inventory list's Filter `ToolbarMenuButton` menu
 * as its "Status" control.
 */
export function ArchiveSegmentedControl({
  value,
  onChange,
}: ArchiveSegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Archive status"
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
