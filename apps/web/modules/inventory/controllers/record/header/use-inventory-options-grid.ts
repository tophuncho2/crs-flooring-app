"use client"

import { useCallback, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { InventoryListFilters, ListInput, ListOutput } from "@builders/application"
import type { InventoryRow } from "@builders/domain"
import {
  INVENTORY_LIST_QUERY_KEY,
  listInventoryRequest,
} from "@/modules/inventory/data/list-inventory-request"

/** A list-shaped fetcher the grid can page through (list read or merge candidates). */
export type InventoryOptionsGridRequest = (
  input: ListInput<InventoryListFilters>,
) => Promise<ListOutput<InventoryRow>>

/** Picker grid page size — small so the reference header stays compact. */
export const INVENTORY_PICKER_PAGE_SIZE = 15

export type InventoryOptionsGridController = {
  rows: ReadonlyArray<InventoryRow>
  total: number
  page: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  goToPrevious: () => void
  goToNext: () => void
  invNumber: string
  rollNumber: string
  dyeLot: string
  note: string
  setInvNumber: (value: string) => void
  setRollNumber: (value: string) => void
  setDyeLot: (value: string) => void
  setNote: (value: string) => void
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
 * endpoint the inventory list view uses (`listInventoryRequest`); the merge
 * picker injects `requestFn`/`queryKey` to page through the merge-candidate
 * endpoint instead (zero-balance + already-merged rows excluded). Warehouse + the
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
  const [page, setPage] = useState(1)

  // Re-scoping (different warehouse / WO product) returns to page 1. Reset during
  // render against the previous scope rather than in an effect — React applies
  // it before paint with no extra commit (the recommended "adjust state when a
  // prop changes" pattern).
  const scopeKey = `${warehouseId ?? ""}|${productFilterId ?? ""}`
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey)
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey)
    setPage(1)
  }

  // Any identity filter change resets to the first page (mirrors the list-view
  // controller's behaviour).
  const setInvNumber = useCallback((value: string) => {
    setInvNumberState(value)
    setPage(1)
  }, [])
  const setRollNumber = useCallback((value: string) => {
    setRollNumberState(value)
    setPage(1)
  }, [])
  const setDyeLot = useCallback((value: string) => {
    setDyeLotState(value)
    setPage(1)
  }, [])
  const setNote = useCallback((value: string) => {
    setNoteState(value)
    setPage(1)
  }, [])

  const input = useMemo<ListInput<InventoryListFilters>>(() => {
    const filters: InventoryListFilters = {
      ...(warehouseId ? { warehouseId: [warehouseId] } : {}),
      ...(productFilterId ? { productId: [productFilterId] } : {}),
      ...(invNumber.trim() ? { invNumber: invNumber.trim() } : {}),
      ...(rollNumber.trim() ? { rollNumber: rollNumber.trim() } : {}),
      ...(dyeLot.trim() ? { dyeLot: dyeLot.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    return { filters, page, pageSize: INVENTORY_PICKER_PAGE_SIZE }
  }, [warehouseId, productFilterId, invNumber, rollNumber, dyeLot, note, page])

  const query = useQuery({
    queryKey: [...queryKey, "picker", input],
    queryFn: () => requestFn(input),
    enabled,
    placeholderData: keepPreviousData,
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / INVENTORY_PICKER_PAGE_SIZE))
  const rows = query.data?.rows ?? []

  const goToPrevious = useCallback(() => setPage((current) => Math.max(1, current - 1)), [])
  const goToNext = useCallback(() => setPage((current) => current + 1), [])

  const reset = useCallback(() => {
    setInvNumberState("")
    setRollNumberState("")
    setDyeLotState("")
    setNoteState("")
    setPage(1)
  }, [])

  const hasSearch = Boolean(
    invNumber.trim() || rollNumber.trim() || dyeLot.trim() || note.trim(),
  )

  return {
    rows,
    total,
    page,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
    goToPrevious,
    goToNext,
    invNumber,
    rollNumber,
    dyeLot,
    note,
    setInvNumber,
    setRollNumber,
    setDyeLot,
    setNote,
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
