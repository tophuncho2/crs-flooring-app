"use client"

import { useCallback, useState } from "react"
import type { PaginateContract } from "../toolbar/paginate/contracts/paginate-contract"

/**
 * The canonical page size for every read-only `DataTable` embedded in a record
 * view. Record-view sections always paginate at this size — the single source
 * of truth that replaces the per-module `SECTION_PAGE_SIZE = 15` constants.
 * (List *pages* are a separate concern — they page at the larger
 * `LIST_*_PAGE_SIZE` and use {@link useFetchListController}.)
 */
export const RECORD_VIEW_PAGE_SIZE = 15

export type RecordSectionPagination = {
  /** Current 1-based page. Feed this into the section's query key + request. */
  page: number
  pageSize: number
  /** `(page - 1) * pageSize` — the offset for a skip/take request. */
  skip: number
  /** Manual page setter (rarely needed; prefer {@link reset}). */
  setPage: (page: number) => void
  /** Jump back to page 1 — call when the section's scope/filter changes. */
  reset: () => void
  /**
   * Derive the engine `PaginateContract` from the section's current `total`.
   * The module owns the fetch (and the domain types it returns); this engine
   * hook owns the page state + contract derivation, so the section never
   * hand-rolls the contract. Wire the result straight into `DataTable`'s
   * `pagination` prop.
   */
  toContract: (total: number) => PaginateContract
}

/**
 * Engine-owned pagination controller for record-view section tables. Owns the
 * local page state and derives the {@link PaginateContract} the list-view
 * `DataTable` renders, so pagination is a guaranteed property of the surface
 * rather than re-implemented per section.
 *
 * Pure React + the engine's own contract type — it never imports domain,
 * application, or module code. The consuming section supplies `total` from its
 * own (domain-typed) query; the controlled-pagination split keeps the engine in
 * its cage.
 */
export function useRecordSectionPagination(
  pageSize: number = RECORD_VIEW_PAGE_SIZE,
): RecordSectionPagination {
  const [page, setPage] = useState(1)
  const skip = (page - 1) * pageSize
  const reset = useCallback(() => setPage(1), [])

  const toContract = useCallback(
    (total: number): PaginateContract => {
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      return {
        page,
        pageSize,
        totalItems: total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
        onPreviousPage: () => setPage((current) => Math.max(1, current - 1)),
        onNextPage: () => setPage((current) => Math.min(totalPages, current + 1)),
      }
    },
    [page, pageSize],
  )

  return { page, pageSize, skip, setPage, reset, toContract }
}
