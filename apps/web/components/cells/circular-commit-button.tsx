"use client"

import type { EditabilityContract } from "../grid/contracts/grid-editability"

const STATE_CLASS_NAME = {
  pristine:
    "border-[var(--panel-border)] bg-transparent text-transparent cursor-not-allowed",
  dirty:
    "border-sky-500/55 bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 cursor-pointer",
  pending:
    "border-sky-500/45 bg-sky-500/25 text-sky-700 cursor-progress animate-pulse",
  success:
    "border-emerald-500/55 bg-emerald-500/20 text-emerald-700 cursor-default",
} as const

export type CircularCommitButtonState = keyof typeof STATE_CLASS_NAME

export type CircularCommitButtonProps = EditabilityContract & {
  /**
   * Visual + interactive state of the commit button.
   *
   * - `pristine`: row has no unsaved changes; button is disabled and visually
   *   muted. The empty interior signals "nothing to save."
   * - `dirty`: row has unsaved changes; button is enabled. Click fires the
   *   commit handler.
   * - `pending`: an in-flight commit is mid-flight. Button is disabled and
   *   shows a subtle pulse so the user knows the click registered.
   * - `success`: a brief post-commit confirmation pulse; consumers may toggle
   *   back to `pristine` after a short delay or on the next user input.
   */
  state: CircularCommitButtonState
  onClick: () => void
  /**
   * Required for accessibility. Describes the row's commit action so screen
   * readers can disambiguate from other rows ("Save cut log #3").
   */
  ariaLabel: string
  /** Optional title attribute for hover tooltip (e.g. "No changes to save"). */
  title?: string
  className?: string
}

/**
 * Round commit button rendered as the trailing control on each cut-log row.
 * Distinct from the square `CheckboxCell` used for batch finalize selection —
 * the round shape signals "commit this row" while the square shape signals
 * "select this row for batch action."
 *
 * Honors the universal editability contract: when `editable: false`, the
 * button renders disabled regardless of `state`. When `editable: true`, the
 * button is enabled only in the `dirty` state; `pristine`, `pending`, and
 * `success` are non-interactive.
 *
 * Pure UI primitive: no business logic, no async handling. The consumer
 * controls `state` (typically driven by a row controller's pristine/dirty
 * snapshot diff + an in-flight mutation flag) and supplies `onClick`.
 */
export function CircularCommitButton({
  state,
  onClick,
  ariaLabel,
  title,
  className,
  ...editability
}: CircularCommitButtonProps) {
  const isEnabled = editability.editable === true && state === "dirty"
  const showCheck = state !== "pristine"
  return (
    <div className={["flex items-center justify-center", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        onClick={isEnabled ? onClick : undefined}
        disabled={!isEnabled}
        aria-label={ariaLabel}
        aria-disabled={!isEnabled}
        title={title}
        className={[
          "flex h-5 w-5 items-center justify-center rounded-full border transition disabled:cursor-not-allowed",
          STATE_CLASS_NAME[state],
        ].join(" ")}
      >
        <span aria-hidden="true" className={showCheck ? "text-[12px] leading-none" : "sr-only"}>
          {showCheck ? "✓" : ""}
        </span>
      </button>
    </div>
  )
}
