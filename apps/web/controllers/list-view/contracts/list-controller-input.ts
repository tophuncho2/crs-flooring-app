import type { ListGroup, ListInput, ListOutput, ListSort } from "@builders/application"

export type ListControllerUrlSyncMode = "history" | "router"

type ListControllerInputBase<TFilters> = {
  tableKey?: string
  initialSearchQuery?: string
  initialSort?: ListSort
  initialFilters?: TFilters
  initialGroupField?: string | null
  initialPage?: number
  pageSize?: number
  allowedSortFields?: readonly string[]
  allowedGroupFields?: readonly string[]
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
  initialGroups?: ListGroup[]
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
