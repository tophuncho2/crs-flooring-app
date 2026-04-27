"use client"

import { useMemo, type ReactNode } from "react"
import type { GridColumn } from "../contracts/grid-column"
import type { GridControlColumn } from "../contracts/grid-control-column"
import type { GridLayout } from "../contracts/grid-layout"
import type { GridRow } from "../contracts/grid-row"
import { resolveScrollContract, type ScrollContract } from "../contracts/grid-scroll"
import { GridBodyRow } from "../grid-row"
import { buildGridTemplateColumns } from "../internals/build-grid-template"

export type ExpandableRowProps<TParent extends GridRow> = {
  /** Parent row data; rendered via the standard `GridBodyRow` internally. */
  parentRow: TParent
  /** Layout for the parent row — typically the same layout the outer Grid uses. */
  parentLayout: GridLayout<TParent>
  /** Optional scroll contract override; defaults to the grid default. */
  parentScroll?: ScrollContract
  /** Whether the children area is currently visible. */
  expanded: boolean
  /** Per-data-cell renderer for the parent row. */
  renderParentCell?: (column: GridColumn<TParent>, row: TParent) => ReactNode
  /** Renderer for the parent row's control cells (selection, expand toggle, actions). */
  renderParentControl?: (control: GridControlColumn, row: TParent) => ReactNode
  /** Optional row-level click handler for the parent row. */
  onParentClick?: () => void
  /** Aria-label for the parent row when interactive. */
  parentAriaLabel?: string
  /**
   * Child rows JSX — typically a list of `<ScopedRow>` elements. Rendered only
   * when `expanded` is true; a falsy / empty children list falls back to
   * `emptyState`.
   */
  children?: ReactNode
  /** Shown when expanded and no children are present. */
  emptyState?: ReactNode
  /** Shown after children when expanded — typically an "Add row" affordance. */
  footer?: ReactNode
  /** Background tone applied to the children area. Default: subtle muted tint. */
  childrenAreaClassName?: string
}

/**
 * Parent row + expandable children area, designed to drop into a `<Grid>` via
 * its `renderRow` prop. Replaces the verbose `<Fragment><GridBodyRow .../>...
 * children</Fragment>` pattern with a single component that:
 *
 *   1. Renders the parent row via `GridBodyRow` (computing `templateColumns`
 *      and resolving the scroll contract internally — no boilerplate at the
 *      call-site).
 *   2. When `expanded`, renders the child rows below the parent in a tinted
 *      panel that visually scopes them to their parent.
 *   3. Falls back to `emptyState` when expanded with no children present.
 *   4. Renders an optional `footer` slot below the children — typically holds
 *      an "Add row" affordance.
 *
 * The chevron toggle itself is a separate primitive (`ExpandToggle`) — drop it
 * into the parent's `expand` control column via `renderParentControl`.
 */
export function ExpandableRow<TParent extends GridRow>({
  parentRow,
  parentLayout,
  parentScroll,
  expanded,
  renderParentCell,
  renderParentControl,
  onParentClick,
  parentAriaLabel,
  children,
  emptyState,
  footer,
  childrenAreaClassName,
}: ExpandableRowProps<TParent>) {
  const resolvedScroll = useMemo(
    () => resolveScrollContract(parentScroll),
    [parentScroll],
  )
  const templateColumns = useMemo(
    () => buildGridTemplateColumns(parentLayout),
    [parentLayout],
  )

  // Detect whether `children` actually contains anything renderable. An array
  // with length 0 (e.g. `cutLogs.map(...)` over `[]`) and `null`/`undefined`
  // both count as "no children" — fall back to `emptyState` in that case.
  const hasChildren = useMemo(() => {
    if (children == null || children === false) return false
    if (Array.isArray(children)) return children.length > 0
    return true
  }, [children])

  return (
    <>
      <GridBodyRow
        row={parentRow}
        layout={parentLayout}
        scroll={resolvedScroll}
        templateColumns={templateColumns}
        renderCell={renderParentCell}
        renderControl={renderParentControl}
        onClick={onParentClick}
        ariaLabel={parentAriaLabel}
      />
      {expanded ? (
        <div
          className={
            childrenAreaClassName ??
            "border-b border-[var(--panel-border)] bg-[var(--panel-border)]/[0.04]"
          }
        >
          {hasChildren
            ? children
            : emptyState != null
              ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--foreground)]/55">
                  {emptyState}
                </div>
              )
              : null}
          {footer ? (
            <div className="border-t border-[var(--panel-border)]/60">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
