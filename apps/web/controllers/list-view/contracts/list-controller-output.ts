import type { ListGroup, ListSort } from "@builders/application"

export type ListControllerOutput<TRow> = {
  rows: TRow[]
  total: number
  groups?: ListGroup[]

  searchQuery: string
  sort: ListSort | null
  groupField: string | null
  page: number
  pageSize: number
  totalPages: number

  onSearchQueryChange: (next: string) => void
  onSortChange: (next: ListSort | null) => void
  onToggleSortDirection: () => void
  onGroupFieldChange: (next: string | null) => void

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

  preferenceError: string
}
