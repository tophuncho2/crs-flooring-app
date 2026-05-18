import type { HeaderAction } from "@/components/headers/contracts/header-action"

export type StagedInventorySectionActionsInput = {
  isSaving: boolean
  isDirty: boolean
  isMarking: boolean
  isSelectionActive: boolean
  hasConflict: boolean
  onAddFilterRow: () => void
  onDiscard: () => void
  onSave: () => void
}

export function stagedInventorySectionActions({
  isSaving,
  isDirty,
  isMarking,
  isSelectionActive,
  hasConflict,
  onAddFilterRow,
  onDiscard,
  onSave,
}: StagedInventorySectionActionsInput): ReadonlyArray<HeaderAction> {
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
  ]
}
