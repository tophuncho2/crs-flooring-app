"use client"

import { useCallback, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { InventoryListFilters, ListInput } from "@builders/application"
import type { InventoryRow } from "@builders/domain"
import {
  INVENTORY_LIST_QUERY_KEY,
  listInventoryRequest,
} from "@/modules/inventory/data/list-inventory-request"

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
 * URL), and fetches a page of `InventoryRow`s through the same list endpoint the
 * inventory list view uses (`listInventoryRequest`). Warehouse + the optional WO
 * product ride in as filters (both optional — the grid lists across all
 * warehouses when none is picked); any filter change resets to page 1. `enabled`
 * gates the fetch so the query only runs while the picker is open (the hook is
 * lifted above the picker so the reference header can read/reset its search bars).
 */
export function useInventoryOptionsGrid({
  warehouseId,
  productFilterId,
  enabled,
}: {
  warehouseId: string | null
  productFilterId: string | null
  enabled: boolean
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
    queryKey: [...INVENTORY_LIST_QUERY_KEY, "picker", input],
    queryFn: () => listInventoryRequest(input),
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
