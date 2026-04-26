"use client"

import { useMemo, type ReactNode } from "react"
import type { GridColumn } from "./contracts/grid-column"
import type { GridControlColumn } from "./contracts/grid-control-column"
import type { GridLayout } from "./contracts/grid-layout"
import type { GridRow } from "./contracts/grid-row"
import type { ScrollContract } from "./contracts/grid-scroll"
import { resolveScrollContract } from "./contracts/grid-scroll"
import type { GridFeatures } from "./contracts/grid-features"
import { GridEmpty } from "./grid-empty"
import { GridHeader } from "./grid-header"
import { GridBodyRow } from "./grid-row"
import { buildGridTemplateColumns } from "./internals/build-grid-template"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type GridProps<TRow extends GridRow> = {
  rows: ReadonlyArray<TRow>
  /** Canonical layout: data columns + optional leading/trailing control columns. */
  layout: GridLayout<TRow>
  scroll?: ScrollContract
  features?: GridFeatures
  empty?: ReactNode
  /** Slot rendered above the grid header — typically holds search/sort controls. */
  headerSlot?: ReactNode
  /** Slot rendered below the body — typically holds pagination controls. */
  footerSlot?: ReactNode
  /** Override the default per-row renderer. */
  renderRow?: (row: TRow) => ReactNode
  /** Override the default per-data-cell renderer (used when `renderRow` is not set). */
  renderCell?: (column: GridColumn<TRow>, row: TRow) => ReactNode
  /** Renderer for control-column cells (selection checkbox, expand toggle, etc.). */
  renderControl?: (control: GridControlColumn, row: TRow) => ReactNode
  className?: string
}

/**
 * Universal grid shell. Subsumes the role of both list-view tables and
 * record-view sub-grids. CSS Grid layout — header + body rows share the same
 * `grid-template-columns` template so column edges align across the whole
 * grid even when row contents vary in height.
 *
 * Feature-agnostic: search / sort / group / paginate are opt-in; the grid
 * does not import any feature module — consumers compose feature controls
 * via `headerSlot` / `footerSlot`.
 */
export function Grid<TRow extends GridRow>({
  rows,
  layout,
  scroll,
  features: _features,
  empty,
  headerSlot,
  footerSlot,
  renderRow,
  renderCell,
  renderControl,
  className,
}: GridProps<TRow>) {
  const resolvedScroll = resolveScrollContract(scroll)
  const templateColumns = useMemo(() => buildGridTemplateColumns(layout), [layout])

  return (
    <div
      className={joinClassNames(
        "overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-[0_12px_28px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      {headerSlot ? (
        <div className="border-b border-[var(--panel-border)] px-3 py-2">{headerSlot}</div>
      ) : null}
      {rows.length === 0 ? (
        empty ?? <GridEmpty />
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="w-max min-w-full">
            <GridHeader layout={layout} scroll={resolvedScroll} templateColumns={templateColumns} />
            <div>
              {rows.map((row) =>
                renderRow ? (
                  <div key={row.id}>{renderRow(row)}</div>
                ) : (
                  <GridBodyRow
                    key={row.id}
                    row={row}
                    layout={layout}
                    scroll={resolvedScroll}
                    templateColumns={templateColumns}
                    renderCell={renderCell}
                    renderControl={renderControl}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      )}
      {footerSlot ? (
        <div className="border-t border-[var(--panel-border)] px-3 py-2">{footerSlot}</div>
      ) : null}
    </div>
  )
}
