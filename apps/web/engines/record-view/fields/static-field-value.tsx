"use client"

import type { ReactNode } from "react"
import type { CellTone } from "../cells/contracts/cell-tone"

const TONE_CLASS_NAME: Record<CellTone, string> = {
  default: "text-[var(--foreground)]",
  success: "text-emerald-700",
  warning: "text-amber-800",
  error: "text-rose-800",
  processing: "text-blue-800",
  muted: "text-[var(--foreground)]/60",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type StaticFieldValueProps = {
  children: ReactNode
  tone?: CellTone
  className?: string
}

/**
 * Read-only field display. Use when the value isn't from a cell — for
 * example, a derived label, a composed badge, or a multi-line summary.
 *
 * For simple read-only string values, prefer the corresponding cell with
 * `editable: false` (e.g. `<TextCell editable={false} value={…} />`) — it
 * keeps the static-vs-editable contract on the cell where it belongs.
 */
export function StaticFieldValue({ children, tone = "default", className }: StaticFieldValueProps) {
  return (
    <div
      className={joinClassNames(
        "min-h-[2.5rem] rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/10 px-3 py-2 text-sm",
        TONE_CLASS_NAME[tone],
        className,
      )}
    >
      {children}
    </div>
  )
}
