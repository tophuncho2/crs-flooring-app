"use client"

import type { ReactNode } from "react"
import type { BadgeTone } from "./contracts/badge-tone"

// Square-cornered sibling of `StatusBadge`: a tone-driven *value* cell — the
// bordered, tinted rectangle a table value sits inside (Airtable linked-cell
// feel). Shares the `CellTone` vocabulary and the badge tone surface, but renders
// rounded-md, tabular-nums, mixed-case (a value, not an uppercase status label).
// Future clickable linked columns compose this with `RecordOpenButton`.

const TONE_CLASS_NAME: Record<BadgeTone, string> = {
  default: "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]",
  success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-800",
  error: "border-rose-500/35 bg-rose-500/10 text-rose-800",
  processing: "border-blue-500/35 bg-blue-500/10 text-blue-800",
  muted: "border-stone-300/45 bg-stone-200/30 text-stone-700",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export function CellChip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={joinClassNames(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2 py-0.5 text-sm font-medium tabular-nums",
        TONE_CLASS_NAME[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
