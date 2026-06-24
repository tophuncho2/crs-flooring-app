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
}
