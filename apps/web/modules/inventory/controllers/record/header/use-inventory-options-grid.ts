"use client"

import { useCallback, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { InventoryListFilters, ListInput, ListOutput } from "@builders/application"
import type { InventoryRow } from "@builders/domain"
import { useRecordSectionPagination, type PaginateContract } from "@/engines/list-view"
import {
  INVENTORY_LIST_QUERY_KEY,
  listInventoryRequest,
} from "@/modules/inventory/data/list-inventory-request"

/** A list-shaped fetcher the grid can page through (the inventory list read, or any injected variant). */
export type InventoryOptionsGridRequest = (
  input: ListInput<InventoryListFilters>,
) => Promise<ListOutput<InventoryRow>>

export type InventoryOptionsGridController = {
  rows: ReadonlyArray<InventoryRow>
  total: number
  /** Engine-derived pagination contract — wire straight into `DataTable`. */
  pagination: PaginateContract
  invNumber: string
  rollNumber: string
  dyeLot: string
  note: string
  setInvNumber: (value: string) => void
  setRollNumber: (value: string) => void
  setDyeLot: (value: string) => void
  setNote: (value: string) => void
  /** Active server-side sort (drives the DataTable header carets). */
  sort: { field: string; direction: "asc" | "desc" }
  /** Header click → re-sort by that column key (flips if already active). */
  setSort: (key: string) => void
  /** True when any of the four identity search bars holds a value. */
  hasSearch: boolean
  /** Clear all four search bars and return to page 1. */
  reset: () => void
  isLoading: boolean
  isFetching: boolean
  error: string | null
}

/**
 * Local-state controller behind the inventory reference-header picker grid.
 * Holds the four identity search bars + the current page in React state (NOT the
 * URL — the picker's transient search/page must not pollute the record-view
 * URL), and fetches a page of `InventoryRow`s. By default it uses the same list
 * endpoint the inventory list view uses (`listInventoryRequest`); a caller may
 * inject `requestFn`/`queryKey` to page through a different fetcher instead.
 * Warehouse + the
 * optional WO product ride in as filters (both optional — the grid lists across
 * all warehouses when none is picked); any filter change resets to page 1.
 * `enabled` gates the fetch so the query only runs while the picker is open (the
 * hook is lifted above the picker so the reference header can read/reset its bars).
 */
export function useInventoryOptionsGrid({
  warehouseId,
  productFilterId,
  enabled,
  requestFn = listInventoryRequest,
  queryKey = INVENTORY_LIST_QUERY_KEY,
}: {
  warehouseId: string | null
  productFilterId: string | null
  enabled: boolean
  /** Override the fetcher — defaults to the shared list read. */
  requestFn?: InventoryOptionsGridRequest
  /** React-query key prefix paired with `requestFn` (must match the fetcher's cache namespace). */
  queryKey?: readonly unknown[]
}): InventoryOptionsGridController {
  const [invNumber, setInvNumberState] = useState("")
  const [rollNumber, setRollNumberState] = useState("")
  const [dyeLot, setDyeLotState] = useState("")
  const [note, setNoteState] = useState("")
  const [sort, setSortState] = useState<{ field: string; direction: "asc" | "desc" }>({
    field: "createdAt",
    direction: "desc",
  })
  const pager = useRecordSectionPagination()

  // Re-scoping (different warehouse / WO product) returns to page 1. Reset during
  // render against the previous scope rather than in an effect — React applies
  // it before paint with no extra commit (the recommended "adjust state when a
  // prop changes" pattern).
  const scopeKey = `${warehouseId ?? ""}|${productFilterId ?? ""}`
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey)
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey)
    pager.reset()
  }

  // Any identity filter change resets to the first page (mirrors the list-view
  // controller's behaviour).
  const setInvNumber = useCallback((value: string) => {
    setInvNumberState(value)
    pager.reset()
  }, [pager])
  const setRollNumber = useCallback((value: string) => {
    setRollNumberState(value)
    pager.reset()
  }, [pager])
  const setDyeLot = useCallback((value: string) => {
    setDyeLotState(value)
    pager.reset()
  }, [pager])
  const setNote = useCallback((value: string) => {
    setNoteState(value)
    pager.reset()
  }, [pager])

  // Column-header sort: flip direction when the active column is re-clicked,
  // else switch field with a sensible default direction. Resets to page 1.
  const setSort = useCallback((key: string) => {
    setSortState((prev) =>
      prev.field === key
        ? { field: key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field: key, direction: key === "location" ? "asc" : "desc" },
    )
    pager.reset()
  }, [pager])

  const input = useMemo<ListInput<InventoryListFilters>>(() => {
    const filters: InventoryListFilters = {
      ...(warehouseId ? { warehouseId: [warehouseId] } : {}),
      ...(productFilterId ? { productId: [productFilterId] } : {}),
      ...(invNumber.trim() ? { invNumber: invNumber.trim() } : {}),
      ...(rollNumber.trim() ? { rollNumber: rollNumber.trim() } : {}),
      ...(dyeLot.trim() ? { dyeLot: dyeLot.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    return { sort, filters, page: pager.page, pageSize: pager.pageSize }
  }, [warehouseId, productFilterId, invNumber, rollNumber, dyeLot, note, sort, pager.page, pager.pageSize])

  const query = useQuery({
    queryKey: [...queryKey, "picker", input],
    queryFn: () => requestFn(input),
    enabled,
    placeholderData: keepPreviousData,
  })

  const total = query.data?.total ?? 0
  const rows = query.data?.rows ?? []

  const reset = useCallback(() => {
    setInvNumberState("")
    setRollNumberState("")
    setDyeLotState("")
    setNoteState("")
    pager.reset()
  }, [pager])

  const hasSearch = Boolean(
    invNumber.trim() || rollNumber.trim() || dyeLot.trim() || note.trim(),
  )

  return {
    rows,
    total,
    pagination: pager.toContract(total),
    invNumber,
    rollNumber,
    dyeLot,
    note,
    setInvNumber,
    setRollNumber,
    setDyeLot,
    setNote,
    sort,
    setSort,
    hasSearch,
    reset,
    isLoading: enabled && query.isLoading,
    isFetching: query.isFetching,
    error:
      query.isError && query.error instanceof Error
        ? query.error.message
        : query.isError
          ? "Failed to load inventory."
          : null,
  }
}
