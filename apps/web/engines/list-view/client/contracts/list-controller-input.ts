import type { ListInput, ListOutput, ListSort } from "@builders/application"

export type ListControllerUrlSyncMode = "history" | "router"

type ListControllerInputBase<TFilters> = {
  tableKey?: string
  initialSearchQuery?: string
  initialSort?: ListSort
  initialFilters?: TFilters
  initialPage?: number
  pageSize?: number
  allowedSortFields?: readonly string[]
  /**
   * Max simultaneous user-selected sort columns. Default `1` keeps the
   * single-column behavior and URL (`?sort=&sortField=`) byte-identical. A
   * value `> 1` opts the list into multi-column sort: an ordered `?sorts=` URL
   * param, a `sorts` output array, and the `onSortsChange` handler.
   */
  maxSortLevels?: number
  /**
   * Declared filter keys for this list. Each key becomes a multi-value
   * URL query param (`?key=val1&key=val2`). The controller manages state
   * for these keys; consumers slot the canonical FilterControl UI to
   * collect values.
   */
  filterableFields?: readonly string[]
  urlSyncMode?: ListControllerUrlSyncMode
}

export type ListControllerSsrPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref?: string
  nextPageHref?: string
}

export type ListControllerSsrInput<TRow, TFilters = Record<string, never>> = ListControllerInputBase<TFilters> & {
  mode: "ssr"
  initialRows: TRow[]
  initialTotal: number
  pagination?: ListControllerSsrPagination
}

export type ListControllerFreshness = {
  refetchIntervalMs?: number
  staleTimeMs?: number
}

export type ListControllerFetchInput<TRow, TFilters = Record<string, never>> = ListControllerInputBase<TFilters> & {
  mode: "fetch"
  queryKey: readonly unknown[]
  listFn: (input: ListInput<TFilters>) => Promise<ListOutput<TRow>>
  initialData?: ListOutput<TRow>
  freshness?: ListControllerFreshness
}

export type ListControllerInput<TRow, TFilters = Record<string, never>> =
  | ListControllerSsrInput<TRow, TFilters>
  | ListControllerFetchInput<TRow, TFilters>
