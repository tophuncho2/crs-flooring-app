"use client"

import type { ReactNode } from "react"
import type { BadgeTone } from "./contracts/badge-tone"

const TONE_CLASS_NAME: Record<BadgeTone, string> = {
  default: "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]/75",
  success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-800",
  error: "border-rose-500/35 bg-rose-500/10 text-rose-800",
  processing: "border-blue-500/35 bg-blue-500/10 text-blue-800",
  muted: "border-stone-300/45 bg-stone-200/30 text-stone-700",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type BadgeSize = "sm" | "md"

const SIZE_CLASS_NAME: Record<BadgeSize, string> = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-3 py-1.5 text-xs",
}

export function StatusBadge({
  children,
  tone = "default",
  size = "sm",
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  size?: BadgeSize
  className?: string
}) {
  return (
    <span
      className={joinClassNames(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full border font-semibold uppercase tracking-[0.12em]",
        SIZE_CLASS_NAME[size],
        TONE_CLASS_NAME[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
