import type { HeaderAction } from "@/engines/common"

export type MaterialItemsSectionActionsInput = {
  isSaving: boolean
  isDirty: boolean
  hasConflict: boolean
  onDiscard: () => void
  onSave: () => void
  onAddItem: () => void
}

export function materialItemsSectionActions({
  isSaving,
  isDirty,
  hasConflict,
  onDiscard,
  onSave,
  onAddItem,
}: MaterialItemsSectionActionsInput): ReadonlyArray<HeaderAction> {
  return [
    {
      key: "save-mi",
      label: isSaving ? "Saving…" : "Save Material Items",
      onClick: onSave,
      kind: "primary",
      disabled: !isDirty || isSaving || hasConflict,
    },
    {
      key: "discard-mi",
      label: "Discard",
      onClick: onDiscard,
      kind: "secondary",
      disabled: !isDirty || isSaving,
    },
    {
      key: "add-mi",
      label: "+ Add Material Item",
      onClick: onAddItem,
      kind: "secondary",
      disabled: isSaving,
    },
  ]
}
