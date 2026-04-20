"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import { type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import {
  type ProductRecord,
  useProductsListController,
} from "@/modules/products/controllers/use-products-list-controller"
import { ProductsTable } from "./products-table"

type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

export default function FlooringProductsClient({
  initialProducts,
  tableState,
  pagination,
  initialTablePreferences,
}: {
  initialProducts: ProductRecord[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const {
    products,
    message,
    error,
    openCreateProduct,
    openProductRecord,
  } = useProductsListController({
    initialProducts,
  })

  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    filteredRows: filteredProducts,
    sortedRows: sortedProducts,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    visibleColumns: visibleProductColumns,
    onSearchQueryChange,
    onToggleSort,
  } = useConfiguredTableState({
    rows: products,
    tableKey: "products-main",
    fields: [
      { key: "product", label: "Product", getValue: (row) => row.name || "Pending name", groupable: false },
      { key: "category", label: "Category", getValue: (row) => row.category.name, groupable: true },
      { key: "manufacturer", label: "Manufacturer", getValue: (row) => row.manufacturerName, groupable: true },
      { key: "style", label: "Style", getValue: (row) => row.style, groupable: true },
      { key: "color", label: "Color", getValue: (row) => row.color, groupable: true },
      {
        key: "coverage",
        label: "Coverage",
        getValue: (row) => (row.coveragePerUnit ? `${row.coveragePerUnit} / ${row.coverageUnit || "unit"}` : ""),
        groupable: false,
      },
      { key: "width", label: "Width", getValue: (row) => row.width, groupable: false },
      { key: "sheetSize", label: "Sheet Size", getValue: (row) => row.sheetSize, groupable: false },
      { key: "thickness", label: "Thickness", getValue: (row) => row.thickness, groupable: false },
      { key: "unitWeight", label: "Unit Weight", getValue: (row) => row.unitWeight, groupable: false },
    ],
    sortField: (row) => row.name,
    sortFieldKey: "product",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    urlSyncMode: "router",
    initialPreferences: initialTablePreferences,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })

  return (
    <DashboardListPageScaffold
      title={<DashboardCardTitle>Flooring Products</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          count={filteredProducts.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder="Search product name"
          isAscendingSort={isAscendingSort}
          onToggleSort={onToggleSort}
          primaryAction={
            <button type="button" onClick={openCreateProduct} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
              <Plus size={16} />
              Product
            </button>
          }
        />
      }
      notices={<FormStatusNotices message={message} error={error} />}
      table={
        <ProductsTable
          rows={sortedProducts}
          groupedRows={groupedRowTree as GroupedRowTree<ProductRecord>[]}
          isGroupingEnabled={isGroupingEnabled}
          visibleColumnKeys={visibleProductColumns.map((column) => column.key)}
          visibleColumns={visibleProductColumns.map((column) => ({ key: column.key, label: column.label }))}
          pagination={pagination}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredProducts.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenProduct={openProductRecord}
        />
      }
      pagination={
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredProducts.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      }
    />
  )
}
