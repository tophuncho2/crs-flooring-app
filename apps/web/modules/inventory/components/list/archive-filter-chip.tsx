"use client"

export type ArchiveFilterChipProps = {
  /** `undefined` = default (hide archived). `true` = show only archived. */
  value: boolean | undefined
  onChange: (next: boolean | undefined) => void
}

/**
 * Inventory list-view chip — two-state toggle:
 *   - "Hide archived" (default; URL absent) → server hides archived.
 *   - "Archived only" → URL `archived=true` → server returns only archived.
 *
 * Click the active state to revert to the default (hide).
 */
export function ArchiveFilterChip({ value, onChange }: ArchiveFilterChipProps) {
  const isArchivedOnly = value === true
  const label = isArchivedOnly ? "Archived only" : "Hide archived"
  return (
    <button
      type="button"
      onClick={() => onChange(isArchivedOnly ? undefined : true)}
      aria-pressed={isArchivedOnly}
      aria-label={`Archive filter: ${label}`}
      className={[
        "rounded-md border px-3 py-1.5 text-sm transition",
        isArchivedOnly
          ? "border-amber-500/50 bg-amber-500/10 text-amber-700"
          : "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)] hover:border-[var(--panel-border-strong)]",
      ].join(" ")}
    >
      {label}
    </button>
  )
}
