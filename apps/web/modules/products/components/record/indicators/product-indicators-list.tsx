"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { DataTable } from "@/engines/list-view"
import {
  INVENTORY_INDICATOR_SECTION_PAGE_SIZE,
  type InventoryIndicatorRow,
} from "@builders/domain"
import { INDICATORS_LIST_COLUMNS, renderIndicatorsRowCell } from "@/modules/inventory-indicators"
import {
  PRODUCT_INDICATORS_QUERY_KEY,
  productIndicatorsPageRequest,
} from "@/modules/products/data/product-indicators-request"

/**
 * Read-only list face of the product record view's indicators section. Clicking a
 * row opens it in the embedded edit face (via `onSelect`). Create is the modal.
 */
export function ProductIndicatorsList({
  productId,
  onSelect,
}: {
  productId: string
  onSelect: (row: InventoryIndicatorRow) => void
}) {
  const [page, setPage] = useState(1)
  const take = INVENTORY_INDICATOR_SECTION_PAGE_SIZE

  const query = useQuery({
    queryKey: [...PRODUCT_INDICATORS_QUERY_KEY, productId, "record-section", page],
    queryFn: ({ signal }) =>
      productIndicatorsPageRequest(productId, { skip: (page - 1) * take, take }, signal),
  })

  const rows = useMemo<InventoryIndicatorRow[]>(() => query.data?.rows ?? [], [query.data])
  const hasMore = query.data?.hasMore ?? false

  if (query.isError) {
    return <p className="text-sm text-rose-400">Could not load indicators.</p>
  }

  return (
    <DataTable<InventoryIndicatorRow>
      rows={rows}
      columns={INDICATORS_LIST_COLUMNS}
      renderCell={renderIndicatorsRowCell}
      empty={query.isLoading ? "Loading indicators…" : "No indicators yet."}
      onOpenRow={(row) => onSelect(row)}
      getRowAriaLabel={(row) => `Open indicator ${row.indicatorNumber}`}
      cursorPagination={{
        page,
        hasPreviousPage: page > 1,
        hasNextPage: hasMore,
        onPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
        onNextPage: () => setPage((p) => p + 1),
      }}
    />
  )
}
