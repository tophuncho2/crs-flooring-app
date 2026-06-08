"use client"

import type { ReactNode } from "react"
import type { LayoutGridGeometry } from "./contracts/layout-grid-geometry"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

function toCssLength(value: number | string): string {
  return typeof value === "number" ? `${value / 16}rem` : value
}

export type LayoutGridProps = {
  geometry: LayoutGridGeometry
  children: ReactNode
  className?: string
}

/**
 * Positioned-cell grid. The "invisible grid" the field/main sections build
 * on. Default chrome is invisible (no border, no background, no padding) —
 * the placed cells carry the section's visual weight.
 *
 * Children are typically `<CellAt …>` elements that place themselves at
 * explicit `(col, row)` coordinates. With `chrome: "visible"`, the grid gets
 * the same panel-bordered surface as the streaming `Grid` — useful when a
 * positioned layout still wants framed chrome (e.g. a card-style dashboard
 * tile).
 */
export function LayoutGrid({ geometry, children, className }: LayoutGridProps) {
  const chrome = geometry.chrome ?? "invisible"
  const gap = toCssLength(geometry.gap ?? "1rem")
  const rows = geometry.rows ?? "auto"

  const style = {
    gridTemplateColumns: `repeat(${geometry.columns}, minmax(0, 1fr))`,
    ...(rows !== "auto" ? { gridTemplateRows: `repeat(${rows}, auto)` } : {}),
    gap,
  } as const

  return (
    <div
      style={style}
      className={joinClassNames(
        "grid w-full",
        chrome === "visible"
          ? "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.1)]"
          : undefined,
        className,
      )}
    >
      {children}
    </div>
  )
}
