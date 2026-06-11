"use client"

import { useMemo, type ReactNode } from "react"
import { CheckboxCell } from "../../cells"
import { Grid } from "../../grid"
import type { GridColumn, GridControlColumn, GridLayout, GridRow } from "../../grid"
import { SelectAllButton } from "./select-all-button"

/**
 * Shareable multi-select results grid. Generalizes the staged-inventory
 * "select rows then run a batch action" wiring (formerly module-local in
 * imports) onto the engine's own `Grid` + `CheckboxCell` + `SelectAllButton`.
 *
 * The consumer owns selection STATE (a `Set<string>` of row ids, typically from
 * `useGatedBatchSelect` / `useBatchSelectAction`) and passes it down; this
 * primitive prepends a fixed-width selection control column, renders each row's
 * checkbox, and exposes the "Select All Eligible / Clear" affordance in the
 * grid header. Pure record-view engine — it does not reach into list-view.
 *
 * Rows are plain `GridRow`s; the consumer supplies the data columns (each
 * column self-renders via `column.render`, or via the shared `renderCell`).
 */

const DEFAULT_SELECTION_WIDTH = 44

export type BatchSelectGridProps<TRow extends GridRow> = {
  rows: ReadonlyArray<TRow>
  /** Data columns for the candidate rows (each renders via `column.render` or `renderCell`). */
  dataColumns: ReadonlyArray<GridColumn<TRow>>
  /** Optional shared cell renderer, used when a column omits its own `render`. */
  renderCell?: (column: GridColumn<TRow>, row: TRow) => ReactNode
  /** Currently-selected row ids (owned by the consumer's selection controller). */
  selectedIds: Set<string>
  /** Toggle one row's membership in the selection. */
  onToggle: (id: string) => void
  /**
   * Selection-toggle gate (e.g. section dirty / saving). When false, the
   * per-row checkboxes render static and the Select-All button is disabled in
   * its inactive state. Defaults to true.
   */
  canToggleSelection?: boolean
  /**
   * Optional per-row eligibility — ineligible rows render an inert checkbox and
   * cannot be toggled (mirrors imports hiding the checkbox for draft rows).
   * Defaults to "every row selectable".
   */
  isRowSelectable?: (row: TRow) => boolean
  // --- Select-All chrome (wire straight from `useGatedBatchSelect`) ---
  isSelectionActive: boolean
  selectedCount: number
  eligibleCount: number
  onToggleAll: () => void
  /** Aria-label for a row's checkbox. Defaults to the row id. */
  getSelectionAriaLabel?: (row: TRow) => string
  /** Extra controls rendered in the header beside the Select-All button (e.g. search bars). */
  searchSlot?: ReactNode
  /** Rendered below the body — typically pagination controls. */
  footerSlot?: ReactNode
  empty?: ReactNode
  /** Selection column width (px or CSS length). Defaults to 44. */
  selectionWidth?: number | string
  className?: string
}

export function BatchSelectGrid<TRow extends GridRow>({
  rows,
  dataColumns,
  renderCell,
  selectedIds,
  onToggle,
  canToggleSelection = true,
  isRowSelectable,
  isSelectionActive,
  selectedCount,
  eligibleCount,
  onToggleAll,
  getSelectionAriaLabel,
  searchSlot,
  footerSlot,
  empty,
  selectionWidth = DEFAULT_SELECTION_WIDTH,
  className,
}: BatchSelectGridProps<TRow>) {
  const layout = useMemo<GridLayout<TRow>>(() => {
    const selectionControl: GridControlColumn = {
      key: "select",
      kind: "selection",
      width: selectionWidth,
      align: "center",
    }
    return { leadingControls: [selectionControl], dataColumns }
  }, [dataColumns, selectionWidth])

  const isSelectable = (row: TRow) => (isRowSelectable ? isRowSelectable(row) : true)

  return (
    <Grid<TRow>
      rows={rows}
      layout={layout}
      className={className}
      empty={empty}
      headerSlot={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">{searchSlot}</div>
          <SelectAllButton
            isSelectionActive={isSelectionActive}
            selectedCount={selectedCount}
            eligibleCount={eligibleCount}
            canSelect={canToggleSelection}
            onToggle={onToggleAll}
          />
        </div>
      }
      footerSlot={footerSlot}
      renderCell={renderCell}
      renderControl={(_control, row) => (
        <CheckboxCell
          editable={canToggleSelection && isSelectable(row)}
          value={selectedIds.has(row.id)}
          onChange={() => onToggle(row.id)}
          ariaLabel={getSelectionAriaLabel?.(row) ?? `Select ${row.id}`}
        />
      )}
      onRowClick={
        canToggleSelection
          ? (row) => {
              if (isSelectable(row)) onToggle(row.id)
            }
          : undefined
      }
      getRowAriaLabel={(row) => getSelectionAriaLabel?.(row) ?? row.id}
    />
  )
}
