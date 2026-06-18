// Controlled-component contract for pagination. The grid does not paginate
// rows internally — the consumer hands in the page's slice already. This
// contract drives the visual controls (prev/next, page counter) only.

export type PaginateContract = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage?: () => void
  onNextPage?: () => void
  /**
   * Optional href-mode for server-rendered pagination. When provided, the
   * controls render as `<a>` links instead of `<button>`s.
   */
  previousPageHref?: string
  nextPageHref?: string
}

/**
 * Controlled-component contract for *cursor* pagination — lists whose page
 * payload reports only whether a next page exists (`hasMore`) with no total
 * count, so a counted "Page N of M · X items" pager would be dishonest. Drives
 * an always-on prev/next footer; the consumer hands this to the list-view
 * `DataTable` exactly as it hands a counted {@link PaginateContract}, so a
 * cursor footer is a guaranteed property of the surface rather than a
 * per-module hand-rolled control.
 */
export type CursorPaginateContract = {
  /** Current 1-based page, shown as a plain "Page N" label. */
  page: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}
