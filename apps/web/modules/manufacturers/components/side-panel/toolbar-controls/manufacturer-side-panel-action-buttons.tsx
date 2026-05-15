"use client"

const PRIMARY =
  "rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
const SECONDARY =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-50"
const DESTRUCTIVE =
  "rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"

export type ManufacturerSidePanelActionButtonsProps = {
  mode: "create" | "edit"
  isDirty: boolean
  isSaving: boolean
  canSave: boolean
  onSave: () => void
  onClose: () => void
  onDelete: () => void
}

export function ManufacturerSidePanelActionButtons({
  mode,
  isDirty,
  isSaving,
  canSave,
  onSave,
  onClose,
  onDelete,
}: ManufacturerSidePanelActionButtonsProps) {
  const saveDisabled = isSaving || !canSave || (mode === "edit" && !isDirty)

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving}
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
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className={PRIMARY}
        >
          {isSaving
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create"
              : "Save"}
        </button>
      </div>
    </div>
  )
}
