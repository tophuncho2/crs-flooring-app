"use client"

const PRIMARY_BUTTON_CLASS_NAME =
  "rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"

export type RunImportButtonProps = {
  eligibleSelectedCount: number
  isMarking: boolean
  isSaving: boolean
  isDirty: boolean
  onRunImport: () => void
}

/**
 * The "Run Import" action — fires the mark-for-import worker over the
 * currently-selected eligible staged rows. Always visible inside the
 * selection cluster; disabled when no eligible row is selected, the
 * section is dirty, the section is mid-save, or a mark is already in
 * flight. Label flips to "Running..." while marking.
 */
export function RunImportButton({
  eligibleSelectedCount,
  isMarking,
  isSaving,
  isDirty,
  onRunImport,
}: RunImportButtonProps) {
  const disabled =
    eligibleSelectedCount === 0 || isMarking || isSaving || isDirty
  const label = isMarking
    ? "Running..."
    : eligibleSelectedCount > 0
      ? `Run Import (${eligibleSelectedCount})`
      : "Run Import"

  return (
    <button
      type="button"
      onClick={onRunImport}
      disabled={disabled}
      aria-label={label}
      className={PRIMARY_BUTTON_CLASS_NAME}
    >
      {label}
    </button>
  )
}
