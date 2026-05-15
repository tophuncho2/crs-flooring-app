"use client"

import type { ReactNode } from "react"

export type SidePanelPreviewRowProps = {
  /** Primary line on the left (e.g. product name, file title). */
  primary: ReactNode
  /** Optional secondary line beneath primary (e.g. notes). */
  secondary?: ReactNode
  /** Right-aligned meta line (e.g. quantity + unit). */
  meta?: ReactNode
}

/**
 * Single-row primitive for content inside a {@link SidePanelPreview}. No
 * columns — a flex row with primary text top-left, optional secondary text
 * beneath, and optional right-aligned meta. Hover glow matches the row
 * treatment used in list-view tables, in preparation for future
 * click-to-preview behavior.
 */
export function SidePanelPreviewRow({ primary, secondary, meta }: SidePanelPreviewRowProps) {
  return (
    <div className="-mx-2 flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition hover:bg-[var(--panel-hover)]">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-[var(--foreground)]/85">{primary}</span>
        {meta ? (
          <span className="shrink-0 tabular-nums text-[var(--foreground)]/70">{meta}</span>
        ) : null}
      </div>
      {secondary ? (
        <div className="whitespace-pre-wrap text-xs text-[var(--foreground)]/55">{secondary}</div>
      ) : null}
    </div>
  )
}
