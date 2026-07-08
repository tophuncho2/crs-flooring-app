export type SortDirection = "asc" | "desc"

export type ListSort = {
  field: string
  direction: SortDirection
}

export type ListInput<TFilters = Record<string, never>> = {
  search?: string
  /**
   * Single-column sort — the original contract. Still the canonical input for
   * single-sort consumers (inventory, the WO-create adjustments grid).
   */
  sort?: ListSort
  /**
   * Ordered multi-column sort (highest priority first). Additive and opt-in:
   * multi-sort consumers (Work Orders) populate this; everything else keeps
   * reading `sort`. A use case takes the effective list as
   * `input.sorts ?? (input.sort ? [input.sort] : [])`.
   */
  sorts?: ListSort[]
  filters?: TFilters
  page: number
  pageSize: number
}

export type ListOutput<TRow> = {
  rows: TRow[]
  total: number
  /**
   * Optional column rollups computed over the FULL filtered set (not just the
   * current page), keyed by a rollup key the module's read + its column config
   * agree on. Values are display-ready money/quantity strings. Absent for lists
   * that declare no footer rollups; present (e.g. inventory stock-balance total,
   * adjustments quantity total) so the pinned footer can show a live total that
   * tracks the active filters.
   */
  totals?: Record<string, string>
}
