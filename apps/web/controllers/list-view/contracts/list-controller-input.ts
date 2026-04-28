import type { ListGroup, ListInput, ListOutput, ListSort } from "@builders/application"
import type { TablePreferencePayload } from "@builders/domain"

export type ListControllerUrlSyncMode = "history" | "router"

type ListControllerPreferencesInput = {
  tableKey?: string
  initialTablePreferences?: TablePreferencePayload | null
}

type ListControllerInputBase<TFilters> = ListControllerPreferencesInput & {
  initialSearchQuery?: string
  initialSort?: ListSort
  initialFilters?: TFilters
  initialGroupField?: string | null
  initialPage?: number
  pageSize?: number
  allowedSortFields?: readonly string[]
  allowedGroupFields?: readonly string[]
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
