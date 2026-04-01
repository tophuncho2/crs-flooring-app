"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import { renderGroupedTableRows } from "@/modules/shared/engines/list-view/table/render-grouped-table-rows"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/modules/shared/engines/list-view/table/table-shell"
import type { GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import type { ProductRow } from "@/modules/products/controllers/use-products-list-controller"

export function ProductsTable({
  rows,
  groupedRows,
  isGroupingEnabled,
  visibleColumnKeys,
  visibleColumns,
  pagination,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenProduct,
}: {
  rows: ProductRow[]
  groupedRows: GroupedRowTree<ProductRow>[]
  isGroupingEnabled: boolean
  visibleColumnKeys: string[]
  visibleColumns: Array<{ key: string; label: string }>
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    previousPageHref: string
    nextPageHref: string
  }
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenProduct: (productId: string) => void
}) {
  function renderRow(product: ProductRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      product: (columnIndex) => <DashboardListRowCell key="product" columnIndex={columnIndex} className="font-medium">{product.name || "Pending name"}</DashboardListRowCell>,
      category: (columnIndex) => <DashboardListRowCell key="category" columnIndex={columnIndex}>{product.category.name}</DashboardListRowCell>,
      manufacturer: (columnIndex) => <DashboardListRowCell key="manufacturer" columnIndex={columnIndex}>{product.manufacturerName || "-"}</DashboardListRowCell>,
      style: (columnIndex) => <DashboardListRowCell key="style" columnIndex={columnIndex}>{product.style || "-"}</DashboardListRowCell>,
      color: (columnIndex) => <DashboardListRowCell key="color" columnIndex={columnIndex}>{product.color || "-"}</DashboardListRowCell>,
      baseColor: (columnIndex) => <DashboardListRowCell key="baseColor" columnIndex={columnIndex}>{product.baseColor || "-"}</DashboardListRowCell>,
      coverage: (columnIndex) => (
        <DashboardListRowCell key="coverage" columnIndex={columnIndex}>
          {product.coveragePerUnit ? `${product.coveragePerUnit} / ${product.coverageUnit || "unit"}` : "-"}
        </DashboardListRowCell>
      ),
      width: (columnIndex) => <DashboardListRowCell key="width" columnIndex={columnIndex}>{product.width || "-"}</DashboardListRowCell>,
      sheetSize: (columnIndex) => <DashboardListRowCell key="sheetSize" columnIndex={columnIndex}>{product.sheetSize || "-"}</DashboardListRowCell>,
      thickness: (columnIndex) => <DashboardListRowCell key="thickness" columnIndex={columnIndex}>{product.thickness || "-"}</DashboardListRowCell>,
      unitWeight: (columnIndex) => <DashboardListRowCell key="unitWeight" columnIndex={columnIndex}>{product.unitWeight || "-"}</DashboardListRowCell>,
      photos: (columnIndex) => <DashboardListRowCell key="photos" columnIndex={columnIndex}>{product.photoUrls.length}</DashboardListRowCell>,
    }

    return (
      <ClickableTableRow
        key={product.id}
        ariaLabel={`Open product ${product.name || product.style || product.id}`}
        onClick={() => onOpenProduct(product.id)}
      >
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <DashboardListPageTable minWidthClass="min-w-[1400px]" columns={visibleColumns}>
        {isGroupingEnabled
          ? renderGroupedTableRows({
              groups: groupedRows,
              colSpan: visibleColumnKeys.length,
              renderRow,
            })
          : rows.map((product) => renderRow(product))}
        {rows.length === 0 ? <TableEmptyRow message="No flooring products yet." colSpan={visibleColumnKeys.length} /> : null}
      </DashboardListPageTable>
      <TablePaginationControls
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? totalPages}
        pageSize={pagination?.pageSize ?? pageSize}
        totalItems={pagination?.totalItems ?? totalItems}
        hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
        hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
        onPreviousPage={pagination ? undefined : onPreviousPage}
        onNextPage={pagination ? undefined : onNextPage}
        previousPageHref={pagination?.previousPageHref}
        nextPageHref={pagination?.nextPageHref}
      />
    </>
  )
}
