import type { HeaderAction } from "@/components/headers/contracts/header-action"

export type StagedInventoryFilterRowsSectionActionsInput = {
  isSaving: boolean
  isDirty: boolean
  isMarking: boolean
  isSelectionActive: boolean
  hasConflict: boolean
  eligibleSelectedCount: number
  onAddFilterRow: () => void
  onDiscard: () => void
  onSave: () => void
  onRunImport: () => void
}

export function stagedInventoryFilterRowsSectionActions({
  isSaving,
  isDirty,
  isMarking,
  isSelectionActive,
  hasConflict,
  eligibleSelectedCount,
  onAddFilterRow,
  onDiscard,
  onSave,
  onRunImport,
}: StagedInventoryFilterRowsSectionActionsInput): ReadonlyArray<HeaderAction> {
  return [
    {
      key: "add",
      label: "Add Filter Row",
      onClick: onAddFilterRow,
      kind: "secondary",
      disabled: isSaving || isMarking || isSelectionActive,
    },
    {
      key: "discard",
      label: "Discard",
      onClick: onDiscard,
      kind: "secondary",
      disabled: !isDirty || isSaving || isMarking || isSelectionActive,
    },
    {
      key: "save",
      label: isSaving ? "Saving Rows..." : "Save Rows",
      onClick: onSave,
      kind: "primary",
      disabled:
        !isDirty || isSaving || hasConflict || isMarking || isSelectionActive,
    },
    {
      key: "run",
      label: isMarking ? "Running..." : "Run Import",
      onClick: onRunImport,
      kind: "primary",
      disabled:
        eligibleSelectedCount === 0 || isMarking || isSaving || isDirty,
    },
  ]
}
