"use client"

import type { ReactNode } from "react"
import {
  ClickableTableRow,
  DashboardTableCell,
  EmbeddedPageTableShell,
  TableEmptyRow,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
  TablePaginationControls,
} from "@/features/flooring/shared/ui/table/table-shell"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { ProductRow } from "@/features/flooring/products/controllers/use-products-list-controller"

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
  deletingProductId,
  onDeleteProduct,
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
  deletingProductId: string | null
  onDeleteProduct: (product: ProductRow) => void
  onOpenProduct: (productId: string) => void
}) {
  function renderRow(product: ProductRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      product: (columnIndex) => <DashboardTableCell key="product" columnIndex={columnIndex} className="font-medium">{product.name || "Pending name"}</DashboardTableCell>,
      category: (columnIndex) => <DashboardTableCell key="category" columnIndex={columnIndex}>{product.category.name}</DashboardTableCell>,
      manufacturer: (columnIndex) => <DashboardTableCell key="manufacturer" columnIndex={columnIndex}>{product.manufacturerName || "-"}</DashboardTableCell>,
      style: (columnIndex) => <DashboardTableCell key="style" columnIndex={columnIndex}>{product.style || "-"}</DashboardTableCell>,
      color: (columnIndex) => <DashboardTableCell key="color" columnIndex={columnIndex}>{product.color || "-"}</DashboardTableCell>,
      baseColor: (columnIndex) => <DashboardTableCell key="baseColor" columnIndex={columnIndex}>{product.baseColor || "-"}</DashboardTableCell>,
      coverage: (columnIndex) => (
        <DashboardTableCell key="coverage" columnIndex={columnIndex}>
          {product.coveragePerUnit ? `${product.coveragePerUnit} / ${product.coverageUnit || "unit"}` : "-"}
        </DashboardTableCell>
      ),
      width: (columnIndex) => <DashboardTableCell key="width" columnIndex={columnIndex}>{product.width || "-"}</DashboardTableCell>,
      sheetSize: (columnIndex) => <DashboardTableCell key="sheetSize" columnIndex={columnIndex}>{product.sheetSize || "-"}</DashboardTableCell>,
      thickness: (columnIndex) => <DashboardTableCell key="thickness" columnIndex={columnIndex}>{product.thickness || "-"}</DashboardTableCell>,
      unitWeight: (columnIndex) => <DashboardTableCell key="unitWeight" columnIndex={columnIndex}>{product.unitWeight || "-"}</DashboardTableCell>,
      photos: (columnIndex) => <DashboardTableCell key="photos" columnIndex={columnIndex}>{product.photoUrls.length}</DashboardTableCell>,
      actions: (columnIndex) => (
        <DashboardTableCell key="actions" columnIndex={columnIndex}>
          <DeleteRowButton
            onClick={() => onDeleteProduct(product)}
            disabled={deletingProductId === product.id}
          >
            {deletingProductId === product.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow
        key={product.id}
        ariaLabel={`Open product ${product.name || product.style || product.id}`}
        onClick={() => onOpenProduct(product.id)}
      >
        {visibleColumnKeys.map((columnKey, columnIndex) => cells[columnKey](columnIndex))}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<ProductRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleColumnKeys.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((product) => renderRow(product))),
    ])
  }

  return (
    <>
      <EmbeddedPageTableShell minWidthClass="min-w-[1400px]">
        <TableHead>
          <tr>
            {visibleColumns.map((column) => (
              <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
            ))}
          </tr>
        </TableHead>
        <tbody>
          {isGroupingEnabled ? renderGroupedRows(groupedRows) : rows.map((product) => renderRow(product))}
          {rows.length === 0 ? <TableEmptyRow message="No flooring products yet." colSpan={visibleColumnKeys.length} /> : null}
        </tbody>
      </EmbeddedPageTableShell>
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
