"use client"

const PRIMARY =
  "rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
const SECONDARY =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-50"
const DESTRUCTIVE =
  "rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"

export type StagedInvRowEditActionButtonsProps = {
  mode: "create" | "edit"
  isDirty: boolean
  isSaving: boolean
  canSave: boolean
  canDelete: boolean
  onSave: () => void
  onClose: () => void
  onDelete: () => void
}

/**
 * Footer action strip for the staged-inv-row edit panel.
 *
 * Disabled rules:
 *   - Save: !canSave OR (edit mode && !isDirty) OR row not DRAFT
 *   - Delete: edit mode + DRAFT status + !isSaving
 *
 * Create mode hides Delete entirely (nothing to delete yet).
 */
export function StagedInvRowEditActionButtons({
  mode,
  isDirty,
  isSaving,
  canSave,
  canDelete,
  onSave,
  onClose,
  onDelete,
}: StagedInvRowEditActionButtonsProps) {
  const saveDisabled = isSaving || !canSave || (mode === "edit" && !isDirty)
  const deleteDisabled = isSaving || !canDelete

  return (
    <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border)] bg-[var(--panel-background)] px-4 py-3">
      <div className="flex items-center gap-2">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleteDisabled}
            title={deleteDisabled && !isSaving ? "Only draft rows can be deleted" : undefined}
            className={DESTRUCTIVE}
          >
            Delete
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} disabled={isSaving} className={SECONDARY}>
          Cancel
        </button>
        <button type="button" onClick={onSave} disabled={saveDisabled} className={PRIMARY}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}
