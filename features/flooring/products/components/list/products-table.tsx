"use client"

import type { ReactNode } from "react"
import {
  ClickableTableRow,
  TableEmptyRow,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
  TablePaginationControls,
  TableShell,
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
    const cells: Record<string, ReactNode> = {
      product: <td key="product" className="px-3 py-2 font-medium">{product.name || "Pending name"}</td>,
      category: <td key="category" className="px-3 py-2">{product.category.name}</td>,
      manufacturer: <td key="manufacturer" className="px-3 py-2">{product.manufacturerName || "-"}</td>,
      style: <td key="style" className="px-3 py-2">{product.style || "-"}</td>,
      color: <td key="color" className="px-3 py-2">{product.color || "-"}</td>,
      baseColor: <td key="baseColor" className="px-3 py-2">{product.baseColor || "-"}</td>,
      coverage: (
        <td key="coverage" className="px-3 py-2">
          {product.coveragePerUnit ? `${product.coveragePerUnit} / ${product.coverageUnit || "unit"}` : "-"}
        </td>
      ),
      width: <td key="width" className="px-3 py-2">{product.width || "-"}</td>,
      sheetSize: <td key="sheetSize" className="px-3 py-2">{product.sheetSize || "-"}</td>,
      thickness: <td key="thickness" className="px-3 py-2">{product.thickness || "-"}</td>,
      unitWeight: <td key="unitWeight" className="px-3 py-2">{product.unitWeight || "-"}</td>,
      photos: <td key="photos" className="px-3 py-2">{product.photoUrls.length}</td>,
      actions: (
        <td key="actions" className="px-3 py-2">
          <DeleteRowButton
            onClick={() => onDeleteProduct(product)}
            disabled={deletingProductId === product.id}
          >
            {deletingProductId === product.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <ClickableTableRow
        key={product.id}
        ariaLabel={`Open product ${product.name || product.style || product.id}`}
        onClick={() => onOpenProduct(product.id)}
      >
        {visibleColumnKeys.map((columnKey) => cells[columnKey])}
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
      <TableShell minWidthClass="min-w-[1400px]">
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
      </TableShell>
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
