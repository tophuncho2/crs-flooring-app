"use client"

import type { ReactNode } from "react"
import type { CellAlign, CellTone } from "./contracts/cell-base"

const TONE_CLASS_NAME: Record<CellTone, string> = {
  default: "text-[var(--foreground)]",
  success: "text-emerald-700",
  warning: "text-amber-800",
  error: "text-rose-800",
  processing: "text-blue-800",
  muted: "text-[var(--foreground)]/60",
}

const ALIGN_CLASS_NAME: Record<CellAlign, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
}

export type StatCellProps = {
  /** The total to display. Rendered with locale thousands grouping. */
  value?: number
  /**
   * Preformatted display string. When provided it renders verbatim instead of
   * the locale-formatted `value` — for figures that aren't plain integer counts
   * (e.g. an inventory quantity with its unit, "12.50 SF"), preserving exact
   * decimals and suffix. `value` is ignored when this is set.
   */
  display?: string
  tone?: CellTone
  align?: CellAlign
  /** Optional sublabel under the number, e.g. "linked". */
  hint?: ReactNode
  ariaLabel?: string
  className?: string
}

/**
 * Read-only total / statistic display. Always read-only — stats are derived
 * counts, never inline-edited. Drop inside a `<FormField>` (which supplies the
 * label) on the invisible grid; this renders the prominent number + optional
 * hint. The presentational sibling of the editable number-style cells.
 */
export function StatCell({
  value,
  display: displayOverride,
  tone = "default",
  align = "start",
  hint,
  ariaLabel,
  className,
}: StatCellProps) {
  const display =
    displayOverride ?? (value !== undefined && Number.isFinite(value) ? value.toLocaleString("en-US") : "—")
  return (
    <div
      aria-label={ariaLabel}
      className={[
        "flex min-h-[2.5rem] flex-col justify-center gap-0.5 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/10 px-3 py-2",
        ALIGN_CLASS_NAME[align],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={["text-2xl font-semibold leading-none tabular-nums", TONE_CLASS_NAME[tone]].join(" ")}>
        {display}
      </span>
      {hint ? <span className="text-xs text-[var(--foreground)]/55">{hint}</span> : null}
    </div>
  )
}
