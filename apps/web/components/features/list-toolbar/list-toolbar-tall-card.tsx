"use client"

import type { ReactNode } from "react"

export type ListToolbarTallCardProps = {
  label?: string
  children: ReactNode
  className?: string
}

/**
 * Chunky 2-row-tall card that fills a `ListToolbarCell`. A small
 * uppercase label sits at the top; the body holds a single control
 * (segmented toggle, status indicator, future calc readout). Same shape
 * scales up to a `colSpan={2}` cell for 2-row × 2-col calculations
 * cards.
 */
export function ListToolbarTallCard({
  label,
  children,
  className,
}: ListToolbarTallCardProps) {
  return (
    <div
      className={[
        "flex h-full flex-col gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)]/60 px-3 py-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? (
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--foreground)]/55">
          {label}
        </span>
      ) : null}
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  )
}
