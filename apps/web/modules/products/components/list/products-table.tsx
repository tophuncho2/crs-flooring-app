"use client"

import { DataTable, type PaginateContract, type TableOptionsConfig } from "@/engines/list-view"
import type { ProductListRow } from "@builders/domain"
import { PRODUCTS_LIST_COLUMNS } from "./table/products-list-columns"
import { renderProductRowCell } from "./table/products-row-cell"

export type ProductsTableProps = {
  rows: ProductListRow[]
  onOpenProduct: (id: string) => void
  /** Gutter TableOptions menu (the "PROD #" number-search tab). */
  tableOptions?: TableOptionsConfig
  pagination?: PaginateContract
}

export function ProductsTable({
  rows,
  onOpenProduct,
  tableOptions,
  pagination,
}: ProductsTableProps) {
  return (
    <DataTable<ProductListRow>
      rows={rows}
      columns={PRODUCTS_LIST_COLUMNS}
      empty="No flooring products found."
      tableOptions={tableOptions}
      onOpenRow={(row) => onOpenProduct(row.id)}
      getRowAriaLabel={(row) => `Open product ${row.name || row.style || row.id}`}
      renderCell={renderProductRowCell}
      pagination={pagination}
    />
  )
}
