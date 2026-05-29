"use client"

import type { ReactNode } from "react"

export type SectionCardTone = "neutral" | "amber" | "emerald" | "blue" | "rose"

type ToneStyle = { header: string; border: string }

const TONE: Record<SectionCardTone, ToneStyle> = {
  neutral: { header: "border-stone-300/50 bg-stone-200/60", border: "border-stone-300/50" },
  amber: { header: "border-amber-500/35 bg-amber-500/15", border: "border-amber-500/35" },
  emerald: { header: "border-emerald-500/35 bg-emerald-500/15", border: "border-emerald-500/35" },
  blue: { header: "border-blue-500/35 bg-blue-500/15", border: "border-blue-500/35" },
  rose: { header: "border-rose-500/35 bg-rose-500/15", border: "border-rose-500/35" },
}

export type SectionCardProps = {
  title: ReactNode
  /** Right-aligned cluster in the header bar (e.g. status / type pills). */
  headerRight?: ReactNode
  /** Accent applied to the header bar + borders. Default `"neutral"`. */
  tone?: SectionCardTone
  /** Optional footer row, separated from the body by a divider. */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Titled, bordered "group" card: a tone-tinted header bar (title left, optional
 * {@link SectionCardProps.headerRight} cluster right), a bordered body on a warm
 * neutral fill, and an optional footer separated by a divider. A cleaner,
 * header-bar variant of the module-local `InventoryGroup` tab chrome — for any
 * section that wants a real header + status surface wrapped around a field grid.
 */
export function SectionCard({
  title,
  headerRight,
  tone = "neutral",
  footer,
  children,
  className,
}: SectionCardProps) {
  const toneStyle = TONE[tone]
  return (
    <div
      className={[
        "overflow-hidden rounded-lg border bg-[var(--subpanel-background)]",
        toneStyle.border,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={["flex items-center justify-between gap-3 border-b px-3 py-2", toneStyle.header].join(" ")}>
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]/85">
          {title}
        </span>
        {headerRight ? <div className="flex shrink-0 items-center gap-2">{headerRight}</div> : null}
      </div>
      <div className="p-3">{children}</div>
      {footer ? (
        <div className={["border-t px-3 py-2", toneStyle.border].join(" ")}>{footer}</div>
      ) : null}
    </div>
  )
}
