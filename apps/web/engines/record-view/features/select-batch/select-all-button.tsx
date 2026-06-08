"use client"

/**
 * Toggle button for "select all eligible / clear selection" on a record-view
 * grid section. Pairs with `useGatedBatchSelect` (in
 * `apps/web/controllers/record/`), which owns the state and supplies the
 * single `onToggle` handler — this component is pure UI.
 *
 * Rendering contract:
 * - Inactive (selectedCount === 0): label = `"Select All Eligible (${eligibleCount})"`,
 *   disabled when `!canSelect` (section dirty / busy) or `eligibleCount === 0`.
 * - Active (selectedCount > 0): label = `"Clear Selection (${selectedCount})"`,
 *   never disabled — the user can always exit selection mode.
 *
 * Visual: matches the ActionHeader's `kind="secondary"` button styling so the
 * button reads as one of the section's action affordances.
 */

const SECONDARY_BUTTON_CLASS_NAME =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"

export type SelectAllButtonProps = {
  isSelectionActive: boolean
  selectedCount: number
  eligibleCount: number
  /**
   * Selection-toggle gate. When `false`, the button is disabled in its
   * inactive (Select All) state. The active (Clear) state is never gated —
   * the user can always exit selection mode.
   */
  canSelect: boolean
  onToggle: () => void
}

export function SelectAllButton({
  isSelectionActive,
  selectedCount,
  eligibleCount,
  canSelect,
  onToggle,
}: SelectAllButtonProps) {
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
