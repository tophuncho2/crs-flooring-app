"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import type {
  CategoryOption,
  InventoryOption,
  ProductOption,
  WarehouseOption,
} from "@builders/domain"
import { FRESH_ON_OPEN } from "@/query-policies"
import {
  INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
  searchInventoryOptionsRequest,
} from "@/modules/inventory/data/inventory-options-request"
import {
  useInventoryHubSidePanel,
  type InventoryHubSidePanelController,
  type UseInventoryHubSidePanelOptions,
} from "@/modules/inventory/controllers/inventory-hub-side-panel"

const STARTING_LIST_PAGE_SIZE = 20

export type InventoryHubStartingListController = {
  rows: ReadonlyArray<InventoryOption>
  isLoading: boolean
  isError: boolean
  /** False until the first page resolves. */
  hasData: boolean
  /** True once resolved with zero rows. */
  isEmpty: boolean
  hasMore: boolean
  isFetchingMore: boolean
  loadMore: () => void
}

export type InventoryHubStartingController = {
  open: boolean
  setOpen: (open: boolean) => void
  handleClose: () => void
  // ===== Cascade selections =====
  warehouseId: string | null
  warehouseLabel: string | null
  selectWarehouse: (option: WarehouseOption | null) => void
  categoryId: string | null
  categoryLabel: string | null
  selectCategory: (option: CategoryOption | null) => void
  productId: string | null
  productLabel: string | null
  selectProduct: (option: ProductOption | null) => void
  location: string | null
  selectLocation: (value: string | null) => void
  /** Free-text search over the matched rows (debounced into the list query). */
  search: string
  onSearchChange: (next: string) => void
  resetSelections: () => void
  /** True once warehouse + category + product are all chosen. Gates the list. */
  listReady: boolean
  list: InventoryHubStartingListController
  // ===== Cross-panel orchestration =====
  hubPanel: InventoryHubSidePanelController
  /** Open the starting cascade (header button + hub-view back chevron). */
  openStarting: () => void
  /** Row click in the cascade list — enter the hub view for that inventory. */
  openInventoryView: (inventoryId: string) => void
}

/**
 * Controller for the inventory-hub "starting spot" cascade. Owns the single
 * `useInventoryHubSidePanel` instance + the cascade selection state
 * (warehouse → category → product → optional location) + the infinite-scroll
 * inventory list that those filters drive. Mirrors `useTemplateSyncController`,
 * which owns the property hub's single instance the same way.
 *
 * The inventory list reuses `searchInventoryOptionsRequest` (the same endpoint
 * the adjustment inventory picker uses) — warehouse + product + location are the
 * server filters; category scopes the product picker client-side.
 */
export function useInventoryHubStartingController(
  options: Pick<
    UseInventoryHubSidePanelOptions,
    "publishAdjustmentPatch" | "onInventoryUpdated"
  >,
): InventoryHubStartingController {
  const hubPanel = useInventoryHubSidePanel({
    initialInventory: null,
    publishAdjustmentPatch: options.publishAdjustmentPatch,
    onInventoryUpdated: options.onInventoryUpdated,
  })

  const [open, setOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [warehouseLabel, setWarehouseLabel] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [productLabel, setProductLabel] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  // Free-text search over the matched inventory rows — same identity columns
  // (inv#/roll#/dye lot/note) the URL list view searches. Debounced into the
  // query key so each keystroke doesn't refetch (mirrors the list view's 300ms).
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset both the live input and its debounced mirror in one shot so a stale
  // term never lingers against a freshly-scoped list.
  const clearSearch = useCallback(() => {
    setSearch("")
    setDebouncedSearch("")
  }, [])

  const selectWarehouse = useCallback(
    (option: WarehouseOption | null) => {
      setWarehouseId(option?.id ?? null)
      setWarehouseLabel(option?.name ?? null)
      // Warehouse scopes location + the inventory set; cascade-clear downstream.
      setCategoryId(null)
      setCategoryLabel(null)
      setProductId(null)
      setProductLabel(null)
      setLocation(null)
      clearSearch()
    },
    [clearSearch],
  )

  const selectCategory = useCallback(
    (option: CategoryOption | null) => {
      setCategoryId(option?.id ?? null)
      setCategoryLabel(option?.name ?? null)
      // Product is category-scoped; clear it when the category changes.
      setProductId(null)
      setProductLabel(null)
      clearSearch()
    },
    [clearSearch],
  )

  const selectProduct = useCallback(
    (option: ProductOption | null) => {
      setProductId(option?.id ?? null)
      setProductLabel(option?.name ?? null)
      clearSearch()
    },
    [clearSearch],
  )

  const selectLocation = useCallback((value: string | null) => {
    const trimmed = value?.trim() ?? ""
    setLocation(trimmed.length > 0 ? trimmed : null)
  }, [])

  const resetSelections = useCallback(() => {
    setWarehouseId(null)
    setWarehouseLabel(null)
    setCategoryId(null)
    setCategoryLabel(null)
    setProductId(null)
    setProductLabel(null)
    setLocation(null)
    clearSearch()
  }, [clearSearch])

  const listReady =
    warehouseId !== null && categoryId !== null && productId !== null

  const listQuery = useInfiniteQuery({
    enabled: open && listReady,
    queryKey: [
      ...INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
      "hub-starting",
      warehouseId,
      productId,
      location,
      debouncedSearch,
    ],
    queryFn: ({ pageParam, signal }) =>
      searchInventoryOptionsRequest(debouncedSearch, signal, {
        warehouseId: warehouseId as string,
        ...(productId ? { productId } : {}),
        ...(location ? { location } : {}),
        skip: pageParam,
        take: STARTING_LIST_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore
        ? allPages.reduce((acc, page) => acc + page.items.length, 0)
        : undefined,
    gcTime: 0,
    ...FRESH_ON_OPEN,
  })

  const rows = useMemo<ReadonlyArray<InventoryOption>>(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data],
  )

  const loadMore = useCallback(() => {
    if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) return
    void listQuery.fetchNextPage()
  }, [listQuery])

  const list = useMemo<InventoryHubStartingListController>(() => {
    const hasData = listQuery.data !== undefined
    return {
      rows,
      isLoading: listQuery.isLoading,
      isError: listQuery.isError,
      hasData,
      isEmpty: hasData && rows.length === 0,
      hasMore: !!listQuery.hasNextPage,
      isFetchingMore: listQuery.isFetchingNextPage,
      loadMore,
    }
  }, [
    rows,
    listQuery.data,
    listQuery.isLoading,
    listQuery.isError,
    listQuery.hasNextPage,
    listQuery.isFetchingNextPage,
    loadMore,
  ])

  const handleClose = useCallback(() => setOpen(false), [])

  // Open the cascade and ensure the hub view is closed (only one panel at a
  // time). Selections are preserved so the back chevron returns to the same
  // filtered list the user came from.
  const openStarting = useCallback(() => {
    hubPanel.close()
    setOpen(true)
  }, [hubPanel])

  const openInventoryView = useCallback(
    (inventoryId: string) => {
      setOpen(false)
      hubPanel.openForView(inventoryId)
    },
    [hubPanel],
  )

  return {
    open,
    setOpen,
    handleClose,
    warehouseId,
    warehouseLabel,
    selectWarehouse,
    categoryId,
    categoryLabel,
    selectCategory,
    productId,
    productLabel,
    selectProduct,
    location,
    selectLocation,
    search,
    onSearchChange: setSearch,
    resetSelections,
    listReady,
    list,
    hubPanel,
    openStarting,
    openInventoryView,
  }
}
