export type SortDirection = "asc" | "desc"

export type ListSort = {
  field: string
  direction: SortDirection
}

export type ListGroupSelection = {
  field: string
}

export type ListInput<TFilters = Record<string, never>> = {
  search?: string
  sort?: ListSort
  filters?: TFilters
  group?: ListGroupSelection
  page: number
  pageSize: number
}

export type ListGroup = {
  key: string
  count: number
  sum?: Record<string, number>
}

export type ListOutput<TRow> = {
  rows: TRow[]
  total: number
  groups?: ListGroup[]
}
