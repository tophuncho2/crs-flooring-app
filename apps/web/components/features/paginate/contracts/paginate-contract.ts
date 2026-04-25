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
