"use client"

import type { ReactNode } from "react"
import type { BadgeTone } from "./contracts/badge-tone"

const TONE_CLASS_NAME: Record<BadgeTone, string> = {
  default: "bg-[var(--panel-border)]/40 text-[var(--foreground)]/80",
  success: "bg-emerald-500/15 text-emerald-700",
  warning: "bg-amber-500/15 text-amber-800",
  error: "bg-rose-500/15 text-rose-800",
  processing: "bg-blue-500/15 text-blue-800",
  muted: "bg-stone-200/40 text-stone-700",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Smaller inline variant of `StatusBadge` for in-text or in-cell usage. No
 * border, lower contrast — meant to read as a tone-coded chip alongside body
 * text rather than a standalone status pill.
 */
export function TonePill({
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
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
        TONE_CLASS_NAME[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
