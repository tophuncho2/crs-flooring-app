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
  /** True when the live sort deviates from the list's default (`initialSort`).
   * Clients OR this into their `hasActiveFilters` so the toolbar "Clear all"
   * shows for a sort-only change; `onClearAllFilters` resets sort back to
   * default. Always false while the list sits on its seeded default order. */
  hasNonDefaultSort: boolean
  filters: ListFilterValueMap
  page: number
  pageSize: number
  totalPages: number

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
