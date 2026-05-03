"use client"

import { isCutLogPendingEditable, type CutLogRow, type FlooringCutLogStatus } from "@builders/domain"

export type CutLogEditActionButtonsProps = {
  mode: "create" | "edit"
  cutLog: CutLogRow | null
  isDirty: boolean
  isSaving: boolean
  canSave: boolean
  onSave: () => void
  onClose: () => void
  onFinalize: () => void
  onVoid: () => void
  onDelete: () => void
}

const PRIMARY =
  "rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
const SECONDARY =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-50"
const DESTRUCTIVE =
  "rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"

/**
 * Footer action strip for the cut-log edit panel.
 *
 * Disabled rules:
 *   - Save: !canSave OR (edit mode && !isDirty) OR row not pending-editable
 *   - Finalize: edit mode + status PENDING + !isDirty + !isSaving
 *   - Void: edit mode + status PENDING|FINAL + !isSaving (matches data layer)
 *   - Delete: edit mode + status PENDING + !isSaving
 *
 * Create mode hides Finalize / Void / Delete entirely (nothing to act on yet).
 */
export function CutLogEditActionButtons({
  mode,
  cutLog,
  isDirty,
  isSaving,
  canSave,
  onSave,
  onClose,
  onFinalize,
  onVoid,
  onDelete,
}: CutLogEditActionButtonsProps) {
  const status = (cutLog?.status ?? null) as FlooringCutLogStatus | null
  const isPending = status === "PENDING"
  const isFinal = status === "FINAL"
  const isVoid = status === "VOID"

  // Mirrors the server guard: PATCH/DELETE refuse anything that isn't
  // PENDING-editable. Disabling Save here keeps the UI honest.
  const isLocked = mode === "edit" && cutLog != null && !isCutLogPendingEditable(cutLog)
  const saveDisabledTitle = isLocked
    ? isVoid
      ? "This cut log is voided. No further changes are permitted."
      : "This cut log is finalized. Use Void to reverse it."
    : undefined

  const saveDisabled = isSaving || !canSave || (mode === "edit" && !isDirty) || isLocked
  const finalizeDisabled = isSaving || !isPending || isDirty
  const voidDisabled = isSaving || !(isPending || (isFinal && !cutLog?.void))
  const deleteDisabled = isSaving || !isPending

  return (
    <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border)] bg-[var(--panel-background)] px-4 py-3">
      {/* Left: destructive */}
      <div className="flex items-center gap-2">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleteDisabled}
            title={deleteDisabled && !isSaving ? "Only pending cut logs can be deleted" : undefined}
            className={DESTRUCTIVE}
          >
            Delete
          </button>
        ) : null}
      </div>

      {/* Right: cancel + save (+ finalize/void in edit mode) */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} disabled={isSaving} className={SECONDARY}>
          Cancel
        </button>
        {mode === "edit" ? (
          <>
            <button
              type="button"
              onClick={onVoid}
              disabled={voidDisabled}
              title={
                isVoid
                  ? "Already voided"
                  : voidDisabled && !isSaving
                    ? "Void unavailable for this status"
                    : undefined
              }
              className={SECONDARY}
            >
              Void
            </button>
            <button
              type="button"
              onClick={onFinalize}
              disabled={finalizeDisabled}
              title={
                isDirty
                  ? "Save changes before finalizing"
                  : !isPending
                    ? "Only pending cut logs can be finalized"
                    : undefined
              }
              className={PRIMARY}
            >
              {isSaving ? "…" : "Finalize"}
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          title={saveDisabledTitle}
          className={PRIMARY}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}
