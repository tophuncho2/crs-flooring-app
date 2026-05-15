"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { ProductListRow } from "@builders/domain"
import { PRODUCTS_LIST_COLUMNS } from "./table/products-list-columns"
import { renderProductRowCell } from "./table/products-row-cell"

export type ProductsTableProps = {
  rows: ProductListRow[]
  onOpenProduct: (id: string) => void
  pagination?: ReactNode
}

export function ProductsTable({
  rows,
  onOpenProduct,
  pagination,
}: ProductsTableProps) {
  return (
    <DataTable<ProductListRow>
      rows={rows}
      columns={PRODUCTS_LIST_COLUMNS}
      empty="No flooring products found."
      onRowClick={(row) => onOpenProduct(row.id)}
      getRowAriaLabel={(row) => `Open product ${row.name || row.style || row.id}`}
      renderCell={renderProductRowCell}
      footerSlot={pagination}
    />
  )
}
