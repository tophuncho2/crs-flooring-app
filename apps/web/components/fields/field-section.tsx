"use client"

import type { ReactNode } from "react"
import { LayoutGrid } from "../layout-grid/layout-grid"
import { FIELD_SECTION_COLUMNS } from "../layout-grid/contracts/layout-grid-geometry"

export type FieldSectionProps = {
  children: ReactNode
  /** Gap between cells. Default `"1rem"`. */
  gap?: number | string
  className?: string
}

/**
 * Pre-configured `LayoutGrid` for record-view primary/main sections. Renders
 * an invisible 8-column grid with auto-flex rows. Drop `<CellAt …>` children
 * inside (each wrapping a `<FormField>` + cell) to populate the section.
 *
 * Consumers needing a different column count drop down to `LayoutGrid`
 * directly; this wrapper exists to enforce the 8-column field-section
 * convention without per-consumer boilerplate.
 */
export function FieldSection({ children, gap, className }: FieldSectionProps) {
  return (
    <LayoutGrid
      geometry={{
        columns: FIELD_SECTION_COLUMNS,
        rows: "auto",
        chrome: "invisible",
        gap: gap ?? "1rem",
      }}
      className={className}
    >
      {children}
    </LayoutGrid>
  )
}
