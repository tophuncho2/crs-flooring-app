"use client"

import { StatusBadge } from "@/components/badges"
import { SelectAllEligibleButton } from "./select-all-eligible-button"
import { RunImportButton } from "./run-import-button"

export type StagedInventorySelectionClusterProps = {
  selection: {
    isSelectionActive: boolean
    selectedCount: number
    eligibleCount: number
    canToggleSelection: boolean
    onToggleSelection: () => void
  }
  runImport: {
    eligibleSelectedCount: number
    isMarking: boolean
    isSaving: boolean
    isDirty: boolean
    onRunImport: () => void
  }
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Grouped cluster holding the batch-selection affordances: a "Ready to
 * queue" status pill (only when armed), the Select-All / Clear toggle,
 * and the single Run Import action button. Sits to the left of the
 * section-action descriptors (Add Filter Row / Discard / Save Rows) via
 * `ActionHeader.extraActions`.
 *
 * Shape is deliberately one-action-per-cluster so a later lift to a
 * shared primitive (`apps/web/components/features/select-batch/`) can
 * replace `runImport` with `actions: SelectionAction[]` without
 * touching consumers other than swapping the import path. The visual
 * tile (rounded border + subtle bg) reads the cluster as one unit when
 * the user is mid-selection — the border tints sky once armed.
 */
export function StagedInventorySelectionCluster({
  selection,
  runImport,
}: StagedInventorySelectionClusterProps) {
  const containerClass = joinClassNames(
    "flex items-center gap-2 rounded-lg border px-2 py-1 transition-colors",
    selection.isSelectionActive
      ? "border-sky-400/55 bg-sky-500/10"
      : "border-[var(--panel-border)] bg-[var(--panel-background)]/40",
  )

  return (
    <div className={containerClass}>
      {selection.isSelectionActive ? (
        <StatusBadge tone="processing">Ready to queue</StatusBadge>
      ) : null}
      <SelectAllEligibleButton
        isSelectionActive={selection.isSelectionActive}
        selectedCount={selection.selectedCount}
        eligibleCount={selection.eligibleCount}
        canSelect={selection.canToggleSelection}
        onToggle={selection.onToggleSelection}
      />
      <RunImportButton
        eligibleSelectedCount={runImport.eligibleSelectedCount}
        isMarking={runImport.isMarking}
        isSaving={runImport.isSaving}
        isDirty={runImport.isDirty}
        onRunImport={runImport.onRunImport}
      />
    </div>
  )
}
