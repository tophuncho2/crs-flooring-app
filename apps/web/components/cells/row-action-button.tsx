"use client"

import type { ReactNode } from "react"
import type { EditabilityContract } from "../grid/contracts/grid-editability"

const TONE_CLASS_NAME = {
  neutral:
    "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)] hover:border-sky-500/45",
  destructive:
    "border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20",
  warning:
    "border-amber-500/45 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20",
  success:
    "border-emerald-500/45 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20",
} as const

export type RowActionButtonTone = keyof typeof TONE_CLASS_NAME

export type RowActionButtonProps = EditabilityContract & {
  /** Button content — text, icon, or both. */
  label: ReactNode
  /** Click handler. Ignored when `editable: false`. */
  onClick: () => void
  /** Required for accessibility — describes the row + the action ("Void cut #3"). */
  ariaLabel: string
  /** Visual tone. Defaults to `neutral`. */
  tone?: RowActionButtonTone
  /** Optional title attribute — useful as a tooltip when disabled (e.g. "Only finalized cuts can be voided"). */
  title?: string
  className?: string
}

/**
 * Generic action button intended for grid trailing-control columns. Used for
 * row-scoped actions like Delete, Void, Restore. Honors the universal
 * `EditabilityContract` — `editable: false` renders the button disabled (with
 * a muted appearance and the optional `title` shown as a tooltip).
 *
 * Place inside a trailing control column whose `kind` matches the action
 * (e.g. `kind: "actions"` for delete, `kind: "void"` for void).
 */
export function RowActionButton({
  label,
  onClick,
  ariaLabel,
  tone = "neutral",
  title,
  className,
  ...editability
}: RowActionButtonProps) {
  const isEnabled = editability.editable === true
  return (
    <button
      type="button"
      onClick={(event) => {
        // Row-action buttons live inside a clickable row. Without stopping
        // propagation, clicking the action also fires the row's `onClick`
        // (typically an "open detail panel" handler) — a confusing
        // double-action. Stop unconditionally so disabled clicks don't
        // bubble either.
        event.stopPropagation()
        if (isEnabled) onClick()
      }}
      disabled={!isEnabled}
      aria-label={ariaLabel}
      title={title}
      className={[
        "rounded-md border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        TONE_CLASS_NAME[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  )
}
