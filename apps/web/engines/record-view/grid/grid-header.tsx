"use client"

import type { CellAlign } from "./contracts/grid-cell-kind"
import type { GridLayout } from "./contracts/grid-layout"
import type { GridRow } from "./contracts/grid-row"
import type { ResolvedScrollContract } from "./contracts/grid-scroll"

const ALIGN_CLASS_NAME = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
} as const

const HEADER_CELL_BASE_CLASS_NAME =
  "flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type GridHeaderProps<TRow extends GridRow> = {
  layout: GridLayout<TRow>
  scroll: ResolvedScrollContract
  /** Pre-computed `grid-template-columns` value shared with the body rows. */
  templateColumns: string
  className?: string
}

/**
 * Header row for the universal Grid. CSS Grid layout — uses the same
 * `grid-template-columns` template the body rows use so column edges align.
 * Renders leading control headers, data column labels, and trailing control
 * headers in template order.
 *
 * When `scroll.clipColumnsToTrack` is on, each label is rendered inside an
 * inner `<span>` that owns the truncation (`min-w-0 truncate`). This is what
 * makes `text-overflow: ellipsis` actually fire — applied to a flex parent
 * with an anonymous text node it is unreliable; applied to a block-level
 * inner span it is well-defined. The full label is mirrored to `title` so a
 * truncated header is still discoverable on hover.
 */
export function GridHeader<TRow extends GridRow>({
  layout,
  scroll,
  templateColumns,
  className,
}: GridHeaderProps<TRow>) {
  return (
    <div
      style={{ gridTemplateColumns: templateColumns }}
      className={joinClassNames(
        "grid border-b border-[var(--panel-border)] bg-[var(--panel-border)]/10",
        scroll.headerSticky ? "sticky top-0 z-10" : undefined,
        className,
      )}
    >
      {layout.leadingControls?.map((control) => (
        <HeaderCell
          key={control.key}
          label={control.label ?? ""}
          align={control.align ?? "center"}
          scroll={scroll}
        />
      ))}
      {layout.dataColumns.map((column) => (
        <HeaderCell
          key={column.key}
          label={column.label}
          align={column.align ?? "start"}
          scroll={scroll}
        />
      ))}
      {layout.trailingControls?.map((control) => (
        <HeaderCell
          key={control.key}
          label={control.label ?? ""}
          align={control.align ?? "center"}
          scroll={scroll}
        />
      ))}
    </div>
  )
}

function HeaderCell({
  label,
  align,
  scroll,
}: {
  label: string
  align: CellAlign
  scroll: ResolvedScrollContract
}) {
  if (scroll.clipColumnsToTrack) {
    return (
      <div
        className={joinClassNames(
          HEADER_CELL_BASE_CLASS_NAME,
          ALIGN_CLASS_NAME[align],
          "min-w-0 overflow-hidden",
        )}
      >
        {label ? (
          <span className="min-w-0 truncate" title={label}>
            {label}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={joinClassNames(
        HEADER_CELL_BASE_CLASS_NAME,
        ALIGN_CLASS_NAME[align],
        scroll.noWrapHeaders ? "whitespace-nowrap" : undefined,
      )}
    >
      {label}
    </div>
  )
}
