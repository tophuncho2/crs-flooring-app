import type { ReactNode } from "react"

/**
 * One tab in the table-header {@link TableOptionsConfig} popover. Open-ended by
 * design — today the only tab is "Sort", but column visibility / density / export
 * controls slot in the same way. The engine owns the tab strip + popover chrome;
 * the consumer owns each tab's body via {@link render}.
 */
export type TableOptionsTab = {
  /** Stable tab id (selected-tab state keys off it). */
  key: string
  /** Tab strip label. */
  label: string
  /** Renders the tab body. Call `close` to dismiss the popover (e.g. after Apply). */
  render: (close: () => void) => ReactNode
  /** True when this tab is narrowing/altering the view — drives the trigger's
   *  aggregate active dot. Tab-agnostic so new tabs self-report. */
  active?: boolean
}

/**
 * Optional table-options control for the {@link DataTable}. When supplied, the
 * table renders an icon trigger inside the leading open-gutter column header that
 * opens a tabbed popover. Additive/opt-in: absent → no trigger, and the gutter
 * gates exactly as before. Setting this also force-renders the gutter header so
 * the trigger has a home even when the consumer passes no row open/actions.
 */
export type TableOptionsConfig = {
  /** Tabs in display order. The first is selected by default. */
  tabs: TableOptionsTab[]
  /** Trigger aria-label. Defaults to "Table options". */
  ariaLabel?: string
}
