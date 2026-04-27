import type { ListGroup, ListInput, ListOutput, ListSort } from "@builders/application"

export type ListControllerUrlSyncMode = "history" | "router" | "none"

type ListControllerInputBase<TFilters> = {
  initialSearchQuery?: string
  initialSort?: ListSort
  initialFilters?: TFilters
  initialGroupField?: string
  initialPage?: number
  pageSize?: number
  allowedSortFields?: readonly string[]
  allowedGroupFields?: readonly string[]
  urlSyncMode?: ListControllerUrlSyncMode
}

export type ListControllerSsrInput<TRow, TFilters = Record<string, never>> = ListControllerInputBase<TFilters> & {
  mode: "ssr"
  initialRows: TRow[]
  initialTotal: number
  initialGroups?: ListGroup[]
}

export type ListControllerFetchInput<TRow, TFilters = Record<string, never>> = ListControllerInputBase<TFilters> & {
  mode: "fetch"
  queryKey: readonly unknown[]
  listFn: (input: ListInput<TFilters>) => Promise<ListOutput<TRow>>
  initialData?: ListOutput<TRow>
}

export type ListControllerInput<TRow, TFilters = Record<string, never>> =
  | ListControllerSsrInput<TRow, TFilters>
  | ListControllerFetchInput<TRow, TFilters>
