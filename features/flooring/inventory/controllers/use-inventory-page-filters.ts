"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import type { InventoryFilterState, InventoryStatusFilter } from "@/features/flooring/inventory/domain/filters"
import {
  ALL_INVENTORY_STATUS_FILTER,
  ALL_INVENTORY_WAREHOUSE_FILTER,
} from "@/features/flooring/inventory/domain/filters"

function buildFilterSearchParams(
  currentSearchParams: URLSearchParams,
  nextFilters: InventoryFilterState,
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams)

  nextSearchParams.delete("page")

  if (nextFilters.status === ALL_INVENTORY_STATUS_FILTER) {
    nextSearchParams.delete("status")
  } else {
    nextSearchParams.set("status", nextFilters.status)
  }

  if (nextFilters.warehouseId === ALL_INVENTORY_WAREHOUSE_FILTER) {
    nextSearchParams.delete("warehouse")
  } else {
    nextSearchParams.set("warehouse", nextFilters.warehouseId)
  }

  return nextSearchParams
}

export function useInventoryPageFilters(initialFilters: InventoryFilterState) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState(initialFilters.status)
  const [warehouseId, setWarehouseId] = useState(initialFilters.warehouseId)

  function getCurrentSearchParams() {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search)
    }

    return new URLSearchParams(searchParams?.toString() ?? "")
  }

  function replaceFilters(nextFilters: InventoryFilterState) {
    if (!pathname) return

    const nextSearchParams = buildFilterSearchParams(getCurrentSearchParams(), nextFilters)
    const queryString = nextSearchParams.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  function onStatusChange(nextStatus: InventoryStatusFilter) {
    setStatus(nextStatus)
    replaceFilters({ status: nextStatus, warehouseId })
  }

  function onWarehouseChange(nextWarehouseId: string) {
    setWarehouseId(nextWarehouseId)
    replaceFilters({ status, warehouseId: nextWarehouseId })
  }

  return {
    status,
    warehouseId,
    onStatusChange,
    onWarehouseChange,
  }
}
