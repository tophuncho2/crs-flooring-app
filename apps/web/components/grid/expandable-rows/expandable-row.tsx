"use client"

import { useMemo, type ReactNode } from "react"
import type { GridColumn } from "../contracts/grid-column"
import type { GridControlColumn } from "../contracts/grid-control-column"
import type { GridLayout } from "../contracts/grid-layout"
import type { GridRow } from "../contracts/grid-row"
import { resolveScrollContract, type ScrollContract } from "../contracts/grid-scroll"
import { GridBodyRow } from "../grid-row"
import { GridHeader } from "../grid-header"
import { buildGridTemplateColumns } from "../internals/build-grid-template"

// ---------- Accent tone palette -------------------------------------------
// A handful of curated tones for the encasing group border + ambient bg tint.
// Default "sky" reads as informational; consumers can shift the palette per
// parent context (e.g. "rose" for a destructive grouping).

type AccentTone = "sky" | "amber" | "emerald" | "rose" | "neutral"

const ACCENT_BG_CLASS_NAME: Record<AccentTone, string> = {
  sky: "bg-sky-500/[0.025]",
  amber: "bg-amber-500/[0.025]",
  emerald: "bg-emerald-500/[0.025]",
  rose: "bg-rose-500/[0.025]",
  neutral: "bg-[var(--panel-border)]/[0.04]",
}
const ACCENT_LABEL_CLASS_NAME: Record<AccentTone, string> = {
  sky: "text-sky-700/85",
  amber: "text-amber-800/85",
  emerald: "text-emerald-700/85",
  rose: "text-rose-700/85",
  neutral: "text-[var(--foreground)]/65",
}
const ACCENT_BADGE_CLASS_NAME: Record<AccentTone, string> = {
  sky: "bg-sky-500/15 text-sky-700",
  amber: "bg-amber-500/15 text-amber-800",
  emerald: "bg-emerald-500/15 text-emerald-700",
  rose: "bg-rose-500/15 text-rose-700",
  neutral: "bg-[var(--panel-border)]/35 text-[var(--foreground)]/75",
}
const ACCENT_BORDER_CLASS_NAME: Record<AccentTone, string> = {
  sky: "border-sky-400/85",
  amber: "border-amber-400/85",
  emerald: "border-emerald-400/85",
  rose: "border-rose-400/85",
  neutral: "border-[var(--panel-border)]",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ExpandableRowProps<
  TParent extends GridRow,
  TChild extends GridRow = GridRow,
> = {
  /** Parent row data; rendered via `GridBodyRow` internally. */
  parentRow: TParent
  /** Layout for the parent row — typically the same layout the outer Grid uses. */
  parentLayout: GridLayout<TParent>
  /** Optional scroll contract override for the parent. */
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

  /** Child rows JSX — typically a list of `<ScopedRow>` elements. */
  children?: ReactNode

  /**
   * Optional small uppercase label rendered above the children (e.g. "Cut
   * Logs"). Adds an accent-coloured strip to clarify the relationship.
   */
  childGroupLabel?: string
  /** Count badge shown next to `childGroupLabel`. */
  childCount?: number
  /**
   * Layout describing the children's columns. When provided, an aligned
   * `GridHeader` is rendered above the children rows so consumers see column
   * names. Use the same layout the consumer hands to each `<ScopedRow>`.
   */
  childLayout?: GridLayout<TChild>
  /** Scroll contract for the auto-rendered child header. */
  childScroll?: ScrollContract
  /** Suppresses the auto-rendered child header even when `childLayout` is set. */
  hideChildHeader?: boolean

  /** Shown when expanded and no children are present. */
  emptyState?: ReactNode
  /** Shown after children when expanded — typically an "Add row" affordance. */
  footer?: ReactNode

  /** Accent tone for the encasing group border, ambient bg, label, and badge. Default: "sky". */
  accentTone?: AccentTone
}

/**
 * Parent row + an "ultra clean" expandable children area, designed to drop
 * into a `<Grid>` via its `renderRow` prop.
 *
 * Visual structure when expanded:
 *
 *   ┌─ encasing accent border ──────────────────────────────────────────┐
 *   │ [parent row]                                                      │
 *   │ children area (subtle ambient tint)                               │
 *   │   <CHILD GROUP LABEL>          [count]                            │
 *   │   <child column header (optional)>                                │
 *   │   <child rows — ScopedRow instances>                              │
 *   │   <empty state (when no children)>                                │
 *   │   <footer (e.g. "+ Add Row")>                                     │
 *   └───────────────────────────────────────────────────────────────────┘
 *
 * - **Encasing accent border** wraps the parent row + its children as one
 *   visual group. Rendered as `border-t border-l border-r` so vertically
 *   adjacent groups share a single 1px line (each group's top doubles as the
 *   previous group's bottom). The outer Grid panel's own border closes off
 *   the last group's bottom edge.
 * - **Ambient tint** sits behind the children area; child rows render with
 *   their own tone on top, producing a layered "card within bay" effect.
 * - **Group label + count** are rendered in a tasteful header strip with the
 *   accent tone, replacing the previous flat divider.
 * - **Child column header** (opt-in via `childLayout`) lets children with a
 *   different column shape than the parent declare their column names inline.
 *
 * The chevron toggle itself is the separate `ExpandToggle` primitive — drop
 * it into the parent's `expand` control column via `renderParentControl`.
 */
export function ExpandableRow<
  TParent extends GridRow,
  TChild extends GridRow = GridRow,
>({
  parentRow,
  parentLayout,
  parentScroll,
  expanded,
  renderParentCell,
  renderParentControl,
  onParentClick,
  parentAriaLabel,
  children,
  childGroupLabel,
  childCount,
  childLayout,
  childScroll,
  hideChildHeader = false,
  emptyState,
  footer,
  accentTone = "sky",
}: ExpandableRowProps<TParent, TChild>) {
  const resolvedParentScroll = useMemo(
    () => resolveScrollContract(parentScroll),
    [parentScroll],
  )
  const parentTemplateColumns = useMemo(
    () => buildGridTemplateColumns(parentLayout),
    [parentLayout],
  )

  const resolvedChildScroll = useMemo(
    () => resolveScrollContract(childScroll),
    [childScroll],
  )
  const childTemplateColumns = useMemo(
    () => (childLayout ? buildGridTemplateColumns(childLayout) : ""),
    [childLayout],
  )

  // `children` is `ReactNode`, which can be: null/undefined, false (e.g. from
  // `cond && <X />`), a single element, or an array (typical from `.map`).
  // Treat empty arrays + falsy values as "no children" so `emptyState` shows.
  const hasChildren = useMemo(() => {
    if (children == null || children === false) return false
    if (Array.isArray(children)) return children.length > 0
    return true
  }, [children])

  const showChildHeader = Boolean(childLayout) && !hideChildHeader && hasChildren

  return (
    <div
      className={joinClassNames(
        "border-t-2 border-l-2 border-r-2",
        ACCENT_BORDER_CLASS_NAME[accentTone],
      )}
    >
      <GridBodyRow
        row={parentRow}
        layout={parentLayout}
        scroll={resolvedParentScroll}
        templateColumns={parentTemplateColumns}
        renderCell={renderParentCell}
        renderControl={renderParentControl}
        onClick={onParentClick}
        ariaLabel={parentAriaLabel}
      />
      {expanded ? (
        <div
          className={joinClassNames(
            "relative",
            ACCENT_BG_CLASS_NAME[accentTone],
          )}
        >
          {childGroupLabel ? (
            <div className="flex items-center gap-2 border-b border-[var(--panel-border)]/45 bg-[var(--panel-background)]/50 px-4 py-2">
              <span
                className={joinClassNames(
                  "text-[10px] font-semibold uppercase tracking-[0.08em]",
                  ACCENT_LABEL_CLASS_NAME[accentTone],
                )}
              >
                {childGroupLabel}
              </span>
              {childCount != null ? (
                <span
                  className={joinClassNames(
                    "rounded-full px-1.5 py-[1px] text-[10px] font-semibold leading-none",
                    ACCENT_BADGE_CLASS_NAME[accentTone],
                  )}
                >
                  {childCount}
                </span>
              ) : null}
            </div>
          ) : null}

          {showChildHeader && childLayout ? (
            <GridHeader
              layout={childLayout}
              scroll={resolvedChildScroll}
              templateColumns={childTemplateColumns}
            />
          ) : null}

          {hasChildren ? (
            children
          ) : emptyState != null ? (
            <div className="flex flex-col items-center gap-1 px-4 py-8 text-center text-sm text-[var(--foreground)]/55">
              {emptyState}
            </div>
          ) : null}

          {footer ? (
            <div className="border-t border-[var(--panel-border)]/45 bg-[var(--panel-background)]/40">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
