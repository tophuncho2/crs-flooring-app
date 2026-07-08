"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { ProductListRow } from "@builders/domain"
import { PRODUCTS_LIST_COLUMNS } from "./table/products-list-columns"
import { renderProductRowCell } from "./table/products-row-cell"

export type ProductsTableProps = {
  rows: ProductListRow[]
  onOpenProduct: (id: string) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}

export function ProductsTable({
  rows,
  onOpenProduct,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: ProductsTableProps) {
  return (
    <DataTable<ProductListRow>
      fill
      resizable
      rows={rows}
      columns={PRODUCTS_LIST_COLUMNS}
      empty="No flooring products found."
      onOpenRow={(row) => onOpenProduct(row.id)}
      getRowAriaLabel={(row) => `Open product ${row.name || row.style || row.id}`}
      renderCell={renderProductRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
