"use client"

import { useRef } from "react"

export const MIN_COLUMN_WIDTH = 64

export type ColumnResizeHandleProps = {
  /** Read the column's current width (px) at drag start — the baseline. Read
   *  lazily so an un-seeded column can measure its live content-fit width. */
  getStartWidth: () => number
  /** Commit a new width (px). The table clamps to {@link MIN_COLUMN_WIDTH}. */
  onResize: (nextWidth: number) => void
  ariaLabel: string
}

/**
 * A thin grab target pinned to a header cell's right edge (the column divider
 * doubles as the handle). Pointer-drag resizes the column: on `pointerdown` it
 * captures the pointer + the start geometry, then translates horizontal movement
 * into a new width off the START width (never compounding), clamped to a minimum.
 * Pointer capture keeps the drag alive even when the cursor leaves the 6px strip.
 * Clicks are stopped so a resize never trips a header/sort handler.
 */
export function ColumnResizeHandle({ getStartWidth, onResize, ariaLabel }: ColumnResizeHandleProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-sky-500/40"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        dragRef.current = { startX: event.clientX, startWidth: getStartWidth() }
        // Optional-chained: jsdom (tests) doesn't implement pointer capture.
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current
        if (!drag) return
        const delta = event.clientX - drag.startX
        onResize(Math.max(MIN_COLUMN_WIDTH, drag.startWidth + delta))
      }}
      onPointerUp={(event) => {
        dragRef.current = null
        event.currentTarget.releasePointerCapture?.(event.pointerId)
      }}
    />
  )
}
