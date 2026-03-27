"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardHeader } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { DashboardTableSurface } from "@/features/flooring/shared/ui/display/dashboard-table-surface"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import { TableActionsSummary } from "@/features/flooring/shared/ui/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import {
  type ProductRow,
  useProductsListController,
} from "@/features/flooring/products/controllers/use-products-list-controller"
import { ProductsCreateModal } from "./products-create-modal"
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
  initialProducts: ProductRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const {
    products,
    message,
    error,
    isCreateModalOpen,
    openCreateProduct,
    closeCreateProduct,
    productForm,
    updateProductForm,
    isSavingProduct,
    isUploadingPhotos,
    isLoadingFormOptions,
    createProduct,
    deletingProductId,
    deleteProduct,
    handlePhotoUpload,
    removePhotoUrl,
    selectedCategory,
    newBaseColor,
    setNewBaseColor,
    addBaseColorOption,
    baseColorOptions,
    categoryOptions,
    manufacturerOptions,
    openProductRecord,
  } = useProductsListController({
    initialProducts,
  })

  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
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
    allColumns: orderedProductColumns,
    visibleColumns: visibleProductColumns,
    hiddenColumnKeys: hiddenProductColumnKeys,
    toggleColumnVisibility: toggleProductColumnVisibility,
    moveColumn: moveProductColumn,
    setColumnOrder: setProductColumnOrder,
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
  } = useConfiguredTableState({
    rows: products,
    tableKey: "products-main",
    fields: [
      { key: "product", label: "Product", getValue: (row) => row.name || "Pending name", groupable: false },
      { key: "category", label: "Category", getValue: (row) => row.category.name, groupable: true },
      { key: "manufacturer", label: "Manufacturer", getValue: (row) => row.manufacturerName, groupable: true },
      { key: "style", label: "Style", getValue: (row) => row.style, groupable: true },
      { key: "color", label: "Color", getValue: (row) => row.color, groupable: true },
      { key: "baseColor", label: "Base Color", getValue: (row) => row.baseColor, groupable: true },
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
      { key: "photos", label: "Photos", getValue: (row) => String(row.photoUrls.length), groupable: false },
      { key: "actions", label: "Actions", getValue: () => "", searchable: false, groupable: false },
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
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <DashboardTableSurface
        title="Flooring Products"
        actions={
          <TableActionsSummary count={filteredProducts.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchPlaceholder="Search product name"
              isAscendingSort={isAscendingSort}
              onToggleSort={onToggleSort}
            >
              <TableColumnSettings
                columns={orderedProductColumns}
                hiddenColumnKeys={hiddenProductColumnKeys}
                onToggleColumn={toggleProductColumnVisibility}
                onMoveColumn={moveProductColumn}
                onSetColumnOrder={setProductColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={onToggleGroupedColumn}
              />
              <button type="button" onClick={openCreateProduct} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                <Plus size={16} />
                Product
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        }
        notices={<FormStatusNotices message={message} error={error} />}
      >
        <ProductsTable
          rows={sortedProducts}
          groupedRows={groupedRowTree as GroupedRowTree<ProductRow>[]}
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
          deletingProductId={deletingProductId}
          onDeleteProduct={deleteProduct}
          onOpenProduct={openProductRecord}
        />
      </DashboardTableSurface>

      <ProductsCreateModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateProduct}
        productForm={productForm}
        selectedCategory={selectedCategory}
        manufacturerOptions={manufacturerOptions}
        categoryOptions={categoryOptions}
        baseColorOptions={baseColorOptions}
        newBaseColor={newBaseColor}
        onNewBaseColorChange={setNewBaseColor}
        onAddBaseColorOption={addBaseColorOption}
        onFieldChange={updateProductForm}
        onPhotoUpload={handlePhotoUpload}
        onRemovePhotoUrl={removePhotoUrl}
        onSave={createProduct}
        isSaving={isSavingProduct}
        isUploadingPhotos={isUploadingPhotos}
        isLoadingOptions={isLoadingFormOptions}
        message=""
        error={error}
      />
    </div>
  )
}
