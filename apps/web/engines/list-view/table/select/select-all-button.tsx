"use client"

/**
 * "Select all eligible / clear selection" toggle for a `DataTable` whose
 * selection feature is enabled. Pure UI — the consumer owns the selection state
 * and supplies the single `onToggle` handler.
 *
 * Rendering contract:
 * - Inactive (selectedCount === 0): label = `"Select All Eligible (${eligibleCount})"`,
 *   disabled when `!canSelect` (busy / gated) or `eligibleCount === 0`.
 * - Active (selectedCount > 0): label = `"Clear Selection (${selectedCount})"`,
 *   never disabled — the user can always exit selection mode.
 *
 * Mirrors record-view's `SelectAllButton`; list-view-local because the engine
 * can't depend on record-view.
 */

const SECONDARY_BUTTON_CLASS_NAME =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"

export type DataTableSelectAllButtonProps = {
  isSelectionActive: boolean
  selectedCount: number
  eligibleCount: number
  /** Gates the inactive (Select All) state. The active (Clear) state is never gated. */
  canSelect: boolean
  onToggle: () => void
}

export function DataTableSelectAllButton({
  isSelectionActive,
  selectedCount,
  eligibleCount,
  canSelect,
  onToggle,
}: DataTableSelectAllButtonProps) {
  const label = isSelectionActive
    ? `Clear Selection (${selectedCount})`
    : `Select All Eligible (${eligibleCount})`
  const disabled = isSelectionActive ? false : !canSelect || eligibleCount === 0

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isSelectionActive}
      className={SECONDARY_BUTTON_CLASS_NAME}
    >
      {label}
    </button>
  )
}
