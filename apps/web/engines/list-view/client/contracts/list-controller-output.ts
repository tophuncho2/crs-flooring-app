import type { ListSort } from "@builders/application"

export type ListFilterValueMap = Record<string, string[]>

export type ListControllerOutput<TRow> = {
  rows: TRow[]
  total: number
  /** Column rollups over the full filtered set (keyed by rollup key), surfaced
   *  by the read's `totals`. Undefined for lists without footer totals. */
  totals?: Record<string, string>

  searchQuery: string
  /** Highest-priority sort (`sorts[0]`), or null. Back-compat single-sort read. */
  sort: ListSort | null
  /** Ordered sort columns, highest priority first. `[]` when unsorted. With
   * `maxSortLevels` unset/1 this is always `sort` as an array of zero or one. */
  sorts: ListSort[]
  /** True when the user has an active sort (`sorts.length > 0`). Sort is no
   * longer client-seeded — an empty sort falls through to the server's uniform
   * base order (createdAt desc, id desc), so "no user sort" reads as unsorted.
   * Clients OR this into their `hasActiveFilters` so the toolbar "Clear all"
   * shows for a sort-only change; `onClearAllFilters` truly empties the sort. */
  hasNonDefaultSort: boolean
  filters: ListFilterValueMap
  page: number
  pageSize: number
  totalPages: number

  /**
   * Persisted column widths (px), keyed by column key — the controller owns this
   * so it survives navigation (localStorage) and the single action-bar "Clear
   * All" resets it alongside search/sort/filters. Pass straight into the
   * `DataTable`'s `columnWidths`/`onColumnWidthsChange` controlled seam. Empty
   * `{}` means "un-customised" (the table falls back to auto content-fit).
   */
  columnWidths: Record<string, number>
  onColumnWidthsChange: (next: Record<string, number>) => void

  onSearchQueryChange: (next: string) => void
  /** Replace the sort with a single column (header-click path). */
  onSortChange: (next: ListSort | null) => void
  onToggleSortDirection: () => void
  /** Set the full ordered sort list (multi-sort menu path). On single-sort
   * lists this collapses to replacing with the first entry. */
  onSortsChange: (next: ListSort[]) => void
  onFilterChange: (key: string, values: string[]) => void
  onClearAllFilters: () => void

  hasPreviousPage: boolean
  hasNextPage: boolean
  goToPreviousPage: () => void
  goToNextPage: () => void
  goToPage: (next: number) => void
  previousPageHref?: string
  nextPageHref?: string

  isLoading: boolean
  isFetching: boolean
  error: unknown
  refetch: () => void
}
