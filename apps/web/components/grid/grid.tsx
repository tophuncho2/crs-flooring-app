"use client"

import { useRef, type ReactNode } from "react"
import type { GridColumn } from "./contracts/grid-column"
import type { GridRow } from "./contracts/grid-row"
import type { ScrollContract } from "./contracts/grid-scroll"
import { resolveScrollContract } from "./contracts/grid-scroll"
import type { GridFeatures } from "./contracts/grid-features"
import { GridEmpty } from "./grid-empty"
import { GridHeader } from "./grid-header"
import { GridBodyRow } from "./grid-row"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type GridProps<TRow extends GridRow> = {
  rows: ReadonlyArray<TRow>
  columns: ReadonlyArray<GridColumn<TRow>>
  scroll?: ScrollContract
  features?: GridFeatures
  empty?: ReactNode
  /** Slot rendered above the grid header — typically holds search/sort controls. */
  headerSlot?: ReactNode
  /** Slot rendered below the body — typically holds pagination controls. */
  footerSlot?: ReactNode
  /** Override the default per-row renderer. */
  renderRow?: (row: TRow) => ReactNode
  /** Override the default per-cell renderer (used when `renderRow` is not set). */
  renderCell?: (column: GridColumn<TRow>, row: TRow) => ReactNode
  className?: string
}

/**
 * Universal grid shell. Subsumes the role of both list-view tables and
 * record-view sub-grids. Feature-agnostic: search / sort / group / paginate
 * are opt-in; the grid does not import any feature module — consumers
 * compose feature controls via `headerSlot` / `footerSlot`.
 *
 * The `features` prop is currently informational; the grid records its
 * presence for future internals (group rendering, sort key application) but
 * the consumer is responsible for delivering already-sorted, already-grouped,
 * already-paginated `rows`. Subsequent sweeps will fold internal handling
 * behind the same prop surface.
 */
export function Grid<TRow extends GridRow>({
  rows,
  columns,
  scroll,
  features: _features,
  empty,
  headerSlot,
  footerSlot,
  renderRow,
  renderCell,
  className,
}: GridProps<TRow>) {
  const resolvedScroll = resolveScrollContract(scroll)
  const scrollRef = useRef<HTMLDivElement | null>(null)

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
        <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain">
          <div className="w-max min-w-full">
            <GridHeader columns={columns} scroll={resolvedScroll} />
            <div>
              {rows.map((row) =>
                renderRow ? (
                  <div key={row.id}>{renderRow(row)}</div>
                ) : (
                  <GridBodyRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    scroll={resolvedScroll}
                    renderCell={renderCell}
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
