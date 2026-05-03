"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import type { ProductListRow } from "@builders/domain"

const PRODUCTS_LIST_LAYOUT: GridLayout<ProductListRow> = {
  dataColumns: [
    { key: "category", label: "Category", minWidth: 140, grow: 1 },
    { key: "name", label: "Product", minWidth: 200, grow: 1 },
    { key: "manufacturer", label: "Manufacturer", minWidth: 160, grow: 1 },
    { key: "style", label: "Style", minWidth: 140, grow: 1 },
    { key: "color", label: "Color", minWidth: 120, grow: 0 },
    { key: "coverage", label: "Coverage", minWidth: 130, grow: 0, align: "end" },
    { key: "width", label: "Width", minWidth: 90, grow: 0 },
    { key: "sheetSize", label: "Sheet Size", minWidth: 110, grow: 0 },
    { key: "thickness", label: "Thickness", minWidth: 100, grow: 0 },
    { key: "unitWeight", label: "Unit Weight", minWidth: 110, grow: 0 },
  ],
}

export type ProductsTableProps = {
  rows: ProductListRow[]
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenProduct: (id: string) => void
}

export function ProductsTable({
  rows,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenProduct,
}: ProductsTableProps) {
  return (
    <Grid<ProductListRow>
      rows={rows}
      layout={PRODUCTS_LIST_LAYOUT}
      empty={<GridEmpty>No flooring products found.</GridEmpty>}
      onRowClick={(row) => onOpenProduct(row.id)}
      getRowAriaLabel={(row) => `Open product ${row.name || row.style || row.id}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "category":
            return <span className="font-medium text-blue-500">{row.category.name}</span>
          case "name":
            return row.name || "Pending name"
          case "manufacturer":
            return row.manufacturerName || "-"
          case "style":
            return row.style || "-"
          case "color":
            return row.color || "-"
          case "coverage":
            return row.coveragePerUnit
              ? <span className="tabular-nums">{row.coveragePerUnit} / {row.itemCoverageUnitName || "unit"}</span>
              : "-"
          case "width":
            return row.width || "-"
          case "sheetSize":
            return row.sheetSize || "-"
          case "thickness":
            return row.thickness || "-"
          case "unitWeight":
            return row.unitWeight || "-"
          default:
            return "-"
        }
      }}
      footerSlot={
        <PaginateControls
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
        />
      }
    />
  )
}
