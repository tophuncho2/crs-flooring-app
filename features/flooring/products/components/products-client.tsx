"use client"

import { type ChangeEvent, type ReactNode, useState } from "react"
import { Plus, Save, Upload, X } from "lucide-react"
import { CollapsibleTableSection } from "../../shared/collapsible-table-section"
import { DashboardCardHeader } from "../../shared/dashboard-card-title"
import { FormStatusNotices } from "../../shared/notices"
import { RecordOptionsMenu } from "../../shared/record-options-menu"
import { DeleteRowButton, EditRowButton, OpenRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { ModalTableHead, ModalTableShell, TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { requestJson } from "../../shared/http"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useServerTableQueryControls } from "../../shared/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"

type CategoryOption = {
  id: string
  name: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
}

type ProductRow = {
  id: string
  name: string
  categoryId: string
  manufacturerId: string
  manufacturerName: string
  style: string
  color: string
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  baseColor: string
  coveragePerUnit: string
  coverageUnit: string
  photoUrls: string[]
  notes: string
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
    sendUnit: string
    stockUnit: string
    coverageAvailableUnit: string
    itemCoverageUnit: string
  }
}

type ProductForm = {
  categoryId: string
  manufacturerId: string
  style: string
  color: string
  baseColor: string
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  coveragePerUnit: string
  photoUrls: string[]
  notes: string
}

type ManufacturerOption = {
  id: string
  name: string
  website: string
  phone: string
  email: string
}

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

type CutLogRow = {
  id: string
  inventoryId: string
  inventoryLabel: string
  itemNumber: string
  before: string
  cut: string
  after: string
  notes: string
  createdAt: string
}

type InventoryRow = {
  id: string
  importEntryId: string
  importNumber: string
  importTag: string
  importStatus: string
  importTransportType: string
  importWarehouseName: string
  productId: string
  productName: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  locationId: string
  locationCode: string
  warehouseName: string
  sectionName: string
  stockCount: string
  cutTotal: string
  runningBalance: string
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
  cutLogs: CutLogRow[]
}

type CutLogDraft = {
  quantityTaken: string
  notes: string
}

const DEFAULT_BASE_COLOR_OPTIONS = [
  "Beige",
  "Black",
  "Blue",
  "Brown",
  "Gray",
  "Green",
  "Multi",
  "Red",
  "Tan",
  "White",
]

const emptyProductForm: ProductForm = {
  categoryId: "",
  manufacturerId: "",
  style: "",
  color: "",
  baseColor: "",
  width: "",
  sheetSize: "",
  thickness: "",
  unitWeight: "",
  coveragePerUnit: "",
  photoUrls: [],
  notes: "",
}

const emptyCutLogDraft: CutLogDraft = {
  quantityTaken: "",
  notes: "",
}

function toProductForm(product: ProductRow): ProductForm {
  return {
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId,
    style: product.style,
    color: product.color,
    baseColor: product.baseColor,
    width: product.width,
    sheetSize: product.sheetSize,
    thickness: product.thickness,
    unitWeight: product.unitWeight,
    coveragePerUnit: product.coveragePerUnit,
    photoUrls: product.photoUrls,
    notes: product.notes,
  }
}

function isValidDecimal(value: string) {
  return /^\d+(\.\d{0,4})?$/.test(value.trim())
}

function parseDecimal(value: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export default function FlooringProductsClient({
  categoryOptions,
  manufacturerOptions,
  initialProducts,
  tableState,
  pagination,
}: {
  categoryOptions: CategoryOption[]
  manufacturerOptions: ManufacturerOption[]
  initialProducts: ProductRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const categories = categoryOptions
  const [products, setProducts] = useState(initialProducts)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [newBaseColor, setNewBaseColor] = useState("")
  const [customBaseColors, setCustomBaseColors] = useState<string[]>([])
  const [activeProduct, setActiveProduct] = useState<ProductRow | null>(null)
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([])
  const [expandedWarehouses, setExpandedWarehouses] = useState<string[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [activeInventoryRowId, setActiveInventoryRowId] = useState<string | null>(null)
  const [cutLogDraft, setCutLogDraft] = useState<CutLogDraft>(emptyCutLogDraft)
  const [isSavingCutLog, setIsSavingCutLog] = useState(false)
  const [cutLogError, setCutLogError] = useState("")
  const [cutLogMessage, setCutLogMessage] = useState("")

  const selectedCategory = categories.find((category) => category.id === productForm.categoryId) ?? null
  const activeInventoryRow = inventoryRows.find((row) => row.id === activeInventoryRowId) ?? null
  const activeRunningBalance = activeInventoryRow ? parseDecimal(activeInventoryRow.runningBalance) : 0
  const canAddPositiveCut = activeRunningBalance > 0
  const draftQuantity = parseDecimal(cutLogDraft.quantityTaken)
  const canSubmitAdjustment = canAddPositiveCut || draftQuantity < 0
  const baseColorOptions = Array.from(
    new Set(
      [...DEFAULT_BASE_COLOR_OPTIONS, ...customBaseColors, ...products.map((product) => product.baseColor)]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b))
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupFields,
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
  } = useConfiguredTableState({
    rows: products,
    tableKey: "products-main",
    fields: [
      { key: "open", label: "Open", getValue: () => "", searchable: false, groupable: false },
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
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const productGroupOptions = groupFields.map((field) => ({ key: field.key, label: field.label }))
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: productGroupOptions,
  })

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function renderProductRow(product: ProductRow) {
    const cells: Record<string, ReactNode> = {
      open: (
        <td key="open" className="px-3 py-2">
          <OpenRowButton onClick={() => void openProductInventory(product)}>Open</OpenRowButton>
        </td>
      ),
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
          <div className="flex gap-2">
            <EditRowButton onClick={() => openEditProduct(product)} />
            <DeleteRowButton onClick={() => void deleteProduct(product)} />
          </div>
        </td>
      ),
    }

    return (
      <tr key={product.id} className="border-t border-[var(--panel-border)]">
        {visibleProductColumns.map((column) => cells[column.key])}
      </tr>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<ProductRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleProductColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((product) => renderProductRow(product))),
    ])
  }

  function openCreateProduct() {
    clearNotices()
    setEditingProduct(null)
    setProductForm(emptyProductForm)
    setNewBaseColor("")
    setIsProductModalOpen(true)
  }

  async function openProductInventory(product: ProductRow) {
    clearNotices()
    setCutLogError("")
    setCutLogMessage("")
    setActiveProduct(product)
    setActiveInventoryRowId(null)
    setCutLogDraft(emptyCutLogDraft)
    setLoadingInventory(true)

    try {
      const payload = await requestJson<{ inventory: InventoryRow[] }>(`/api/flooring/inventory?productId=${product.id}`)
      setInventoryRows(payload.inventory)
      setExpandedWarehouses(Array.from(new Set(payload.inventory.map((row) => row.warehouseName))))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load inventory")
      setInventoryRows([])
      setExpandedWarehouses([])
    } finally {
      setLoadingInventory(false)
    }
  }

  function openEditProduct(product: ProductRow) {
    clearNotices()
    setEditingProduct(product)
    setProductForm(toProductForm(product))
    setNewBaseColor("")
    setIsProductModalOpen(true)
  }

  function closeProductInventory() {
    if (isSavingCutLog) return
    setActiveProduct(null)
    setInventoryRows([])
    setExpandedWarehouses([])
    setActiveInventoryRowId(null)
    setCutLogError("")
    setCutLogMessage("")
    setCutLogDraft(emptyCutLogDraft)
  }

  function openInventoryRow(rowId: string) {
    clearNotices()
    setCutLogError("")
    setCutLogMessage("")
    setCutLogDraft(emptyCutLogDraft)
    setActiveInventoryRowId(rowId)
  }

  function closeInventoryRow() {
    if (isSavingCutLog) return
    setActiveInventoryRowId(null)
    setCutLogError("")
    setCutLogMessage("")
    setCutLogDraft(emptyCutLogDraft)
  }

  async function addCutLog() {
    if (!activeInventoryRow) return

    clearNotices()
    setCutLogError("")
    setCutLogMessage("")
    setIsSavingCutLog(true)

    try {
      if (!cutLogDraft.quantityTaken.trim()) {
        throw new Error("Enter a cut quantity before saving")
      }

      const quantityTaken = parseDecimal(cutLogDraft.quantityTaken)
      if (quantityTaken === 0) {
        throw new Error("Adjustment quantity must be more than 0 or less than 0")
      }

      if (quantityTaken > 0 && activeRunningBalance <= 0) {
        throw new Error("This inventory row has no running balance left")
      }

      if (quantityTaken > activeRunningBalance) {
        throw new Error("Cut quantity cannot exceed the current running balance")
      }

      const payload = await requestJson<{ cutLog: CutLogRow }>("/api/flooring/cut-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: activeInventoryRow.id,
          quantityTaken: cutLogDraft.quantityTaken,
          notes: cutLogDraft.notes,
        }),
      })

      setInventoryRows((prev) =>
        prev.map((row) => {
          if (row.id !== activeInventoryRow.id) return row
          const nextCutTotal = parseDecimal(row.cutTotal) + parseDecimal(payload.cutLog.cut)
          const nextRunningBalance = parseDecimal(row.stockCount) - nextCutTotal
          return {
            ...row,
            cutLogs: [payload.cutLog, ...row.cutLogs],
            cutTotal: nextCutTotal.toFixed(2),
            runningBalance: nextRunningBalance.toFixed(2),
          }
        }),
      )
      setCutLogDraft(emptyCutLogDraft)
      setCutLogError("")
      setCutLogMessage("Cut Saved")
      setMessage("Cut log saved")
    } catch (saveError) {
      setCutLogError(saveError instanceof Error ? saveError.message : "Failed to add cut log")
    } finally {
      setIsSavingCutLog(false)
    }
  }

  async function saveProduct() {
    clearNotices()
    if (!productForm.categoryId) {
      setError("Category is required")
      return
    }
    if (productForm.coveragePerUnit.trim() && !isValidDecimal(productForm.coveragePerUnit)) {
      setError("Coverage per unit must be numeric with up to 4 decimals")
      return
    }

    setIsSavingProduct(true)
    try {
      const body = {
        ...productForm,
        coveragePerUnit: productForm.coveragePerUnit.trim(),
      }

      const payload = editingProduct
        ? await requestJson<{ product: ProductRow }>(`/api/flooring/products/${editingProduct.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await requestJson<{ product: ProductRow }>("/api/flooring/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })

      setProducts((prev) => {
        const next = editingProduct
          ? prev.map((product) => (product.id === payload.product.id ? payload.product : product))
          : [payload.product, ...prev]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setIsProductModalOpen(false)
      setMessage(editingProduct ? "Product updated" : "Product created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save product")
    } finally {
      setIsSavingProduct(false)
    }
  }

  async function deleteProduct(product: ProductRow) {
    if (!window.confirm(`Delete ${product.name || "this product"}?`)) return
    clearNotices()

    try {
      await requestJson<{ success: boolean }>(`/api/flooring/products/${product.id}`, { method: "DELETE" })
      setProducts((prev) => prev.filter((item) => item.id !== product.id))
      setMessage("Product deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete product")
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    clearNotices()
    setIsUploadingPhotos(true)

    try {
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        const payload = await requestJson<{ url: string }>("/api/flooring/product-photos", {
          method: "POST",
          body: formData,
        })
        uploadedUrls.push(payload.url)
      }

      setProductForm((prev) => ({
        ...prev,
        photoUrls: Array.from(new Set([...prev.photoUrls, ...uploadedUrls])),
      }))
      setMessage(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? "" : "s"} uploaded`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload photos")
    } finally {
      setIsUploadingPhotos(false)
      event.target.value = ""
    }
  }

  function removePhotoUrl(url: string) {
    setProductForm((prev) => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((photoUrl) => photoUrl !== url),
    }))
  }

  function addBaseColorOption() {
    const trimmed = newBaseColor.trim()
    if (!trimmed) return
    setCustomBaseColors((prev) => Array.from(new Set([...prev, trimmed])).sort((a, b) => a.localeCompare(b)))
    setProductForm((prev) => ({ ...prev, baseColor: trimmed }))
    setNewBaseColor("")
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
        <DashboardCardHeader
          title="Flooring Products"
          actions={(
            <TableActionsSummary count={filteredProducts.length}>
              <TableControlsBar
                searchQuery={searchQuery}
                onSearchQueryChange={serverTableControls.onSearchQueryChange}
                searchPlaceholder="Search product name"
                isAscendingSort={isAscendingSort}
                onToggleSort={serverTableControls.onToggleSort}
              >
                <TableColumnSettings
                  columns={orderedProductColumns}
                  hiddenColumnKeys={hiddenProductColumnKeys}
                  onToggleColumn={toggleProductColumnVisibility}
                  onMoveColumn={moveProductColumn}
                  onSetColumnOrder={setProductColumnOrder}
                  groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                  maxGroupFields={MAX_GROUP_FIELDS}
                  onToggleGroupedColumn={serverTableControls.onToggleGroupByKey}
                />
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
                >
                  <Plus size={16} />
                  Product
                </button>
              </TableControlsBar>
            </TableActionsSummary>
          )}
        />

        <FormStatusNotices message={message} error={error} className="mt-4" />

        <section className="mt-6">
          <TableShell minWidthClass="min-w-[1400px]">
              <TableHead>
                <tr>
                  {visibleProductColumns.map((column) => (
                    <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                  ))}
                </tr>
              </TableHead>
              <tbody>
                {isGroupingEnabled ? renderGroupedRows(groupedRowTree) : sortedProducts.map((product) => renderProductRow(product))}
                {filteredProducts.length === 0 ? <TableEmptyRow message="No flooring products yet." colSpan={visibleProductColumns.length} /> : null}
              </tbody>
          </TableShell>
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
        </section>
      </div>

      {isProductModalOpen ? (
        <ModalShell title={editingProduct ? "Edit Product" : "Add Product"} onClose={() => setIsProductModalOpen(false)}>
          <div className="space-y-5">
          <FormStatusNotices error={error} loadingMessage={isSavingProduct ? "Saving product..." : isUploadingPhotos ? "Uploading photos..." : ""} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="Category Link">
              <select
                value={productForm.categoryId}
                onChange={(event) => setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Coverage Unit">
              <input
                value={selectedCategory?.itemCoverageUnit ?? ""}
                readOnly
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
              />
            </FormField>
            <FormField label="Coverage Per Unit">
              <input
                value={productForm.coveragePerUnit}
                onChange={(event) => setProductForm((prev) => ({ ...prev, coveragePerUnit: event.target.value }))}
                placeholder="0.0000"
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Manufacturer Link">
              <select
                value={productForm.manufacturerId}
                onChange={(event) => setProductForm((prev) => ({ ...prev, manufacturerId: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              >
                <option value="">Select a manufacturer</option>
                {manufacturerOptions.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Style">
              <input
                value={productForm.style}
                onChange={(event) => setProductForm((prev) => ({ ...prev, style: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Color">
              <input
                value={productForm.color}
                onChange={(event) => setProductForm((prev) => ({ ...prev, color: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Base Color">
              <select
                value={productForm.baseColor}
                onChange={(event) => setProductForm((prev) => ({ ...prev, baseColor: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              >
                <option value="">Select a base color</option>
                {baseColorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Add Base Color Option">
              <div className="flex gap-2">
                <input
                  value={newBaseColor}
                  onChange={(event) => setNewBaseColor(event.target.value)}
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
                <button type="button" onClick={addBaseColorOption} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
                  Add
                </button>
              </div>
            </FormField>
            <FormField label="Width">
              <input
                value={productForm.width}
                onChange={(event) => setProductForm((prev) => ({ ...prev, width: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Sheet Size">
              <input
                value={productForm.sheetSize}
                onChange={(event) => setProductForm((prev) => ({ ...prev, sheetSize: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Thickness">
              <input
                value={productForm.thickness}
                onChange={(event) => setProductForm((prev) => ({ ...prev, thickness: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Unit Weight">
              <input
                value={productForm.unitWeight}
                onChange={(event) => setProductForm((prev) => ({ ...prev, unitWeight: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
            <div className="space-y-3">
              <FormField label="Notes">
                <textarea
                  value={productForm.notes}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={5}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <div className="rounded-xl border border-[var(--panel-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Photos</h3>
                    <p className="text-xs text-[var(--foreground)]/65">Drop files here through the bucket upload path. Manual URL entry is no longer part of the product panel flow.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[var(--panel-hover)]">
                    <Upload size={16} />
                    {isUploadingPhotos ? "Uploading..." : "Upload Photos"}
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] p-3">
              <h3 className="font-medium">Preview</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {productForm.photoUrls.map((url) => (
                  <div key={url} className="overflow-hidden rounded-lg border border-[var(--panel-border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Product preview" className="h-28 w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border)] px-2 py-2">
                      <span className="truncate text-xs text-[var(--foreground)]/65">{url}</span>
                      <button type="button" onClick={() => removePhotoUrl(url)} className="rounded-md p-1 text-rose-500 hover:bg-rose-500/10">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {productForm.photoUrls.length === 0 ? (
                  <p className="col-span-2 rounded-lg border border-dashed border-[var(--panel-border)] px-3 py-6 text-center text-sm text-[var(--foreground)]/60">
                    No photos added yet.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsProductModalOpen(false)} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={saveProduct}
              disabled={isSavingProduct || isUploadingPhotos}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              <Save size={16} />
              {isSavingProduct ? "Saving..." : "Save Product"}
            </button>
          </div>
          </div>
        </ModalShell>
      ) : null}

      {activeProduct ? (
        <ModalShell
          title={activeProduct.name || "Product"}
          onClose={closeProductInventory}
          headerActions={
            <RecordOptionsMenu
              items={[
                {
                  label: "Go to Inventory",
                  onSelect: () => {
                    window.location.assign("/dashboard/flooring/inventory")
                  },
                },
              ]}
            />
          }
        >
          <div className="space-y-6">
            <FormStatusNotices message={message} error={error} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Category</p>
                <p className="mt-1 font-medium">{activeProduct.category.name}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Manufacturer</p>
                <p className="mt-1 font-medium">{activeProduct.manufacturerName || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Style</p>
                <p className="mt-1 font-medium">{activeProduct.style || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Color</p>
                <p className="mt-1 font-medium">{activeProduct.color || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Base Color</p>
                <p className="mt-1 font-medium">{activeProduct.baseColor || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Coverage</p>
                <p className="mt-1 font-medium">{activeProduct.coveragePerUnit ? `${activeProduct.coveragePerUnit} / ${activeProduct.coverageUnit || "unit"}` : "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Width</p>
                <p className="mt-1 font-medium">{activeProduct.width || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Sheet Size</p>
                <p className="mt-1 font-medium">{activeProduct.sheetSize || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Thickness</p>
                <p className="mt-1 font-medium">{activeProduct.thickness || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Unit Weight</p>
                <p className="mt-1 font-medium">{activeProduct.unitWeight || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3 md:col-span-2 xl:col-span-4">
                <p className="text-xs text-[var(--foreground)]/60">Notes</p>
                <p className="mt-1 font-medium">{activeProduct.notes || "-"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Inventory by Warehouse</h3>
                <p className="text-sm text-[var(--foreground)]/70">Open an inventory row to manage cuts and review running balance.</p>
              </div>

              {loadingInventory ? (
                <div className="rounded-lg border border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--foreground)]/70">
                  Loading inventory...
                </div>
              ) : inventoryRows.length === 0 ? (
                <div className="rounded-lg border border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--foreground)]/70">
                  No inventory rows found for this product.
                </div>
              ) : (
                Array.from(new Set(inventoryRows.map((row) => row.warehouseName))).map((warehouseName) => {
                  const warehouseRows = inventoryRows.filter((row) => row.warehouseName === warehouseName)

                  return (
                    <CollapsibleTableSection
                      key={warehouseName}
                      title={warehouseName}
                      defaultOpen={expandedWarehouses.includes(warehouseName)}
                      actions={<span className="text-xs text-[var(--foreground)]/60">{warehouseRows.length} rows</span>}
                      className="overflow-hidden rounded-lg border border-[var(--panel-border)] p-0"
                    >
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[980px] text-sm">
                            <thead className="bg-[var(--panel-hover)]/60 text-left">
                              <tr>
                                <th className="h-10 px-3 py-2">Open</th>
                                <th className="h-10 px-3 py-2">Item #</th>
                                <th className="h-10 px-3 py-2">Dye Lot</th>
                                <th className="h-10 px-3 py-2">Section</th>
                                <th className="h-10 px-3 py-2">Location</th>
                                <th className="h-10 px-3 py-2">Starting Stock</th>
                                <th className="h-10 px-3 py-2">Cuts Total</th>
                                <th className="h-10 px-3 py-2">Running Balance</th>
                                <th className="h-10 px-3 py-2">Import #</th>
                              </tr>
                            </thead>
                            <tbody>
                              {warehouseRows.map((row) => (
                                <tr key={row.id} className="border-t border-[var(--panel-border)]">
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => openInventoryRow(row.id)}
                                      className="rounded border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)]"
                                    >
                                      Open
                                    </button>
                                  </td>
                                  <td className="px-3 py-2">{row.itemNumber}</td>
                                  <td className="px-3 py-2">{row.dyeLot || "-"}</td>
                                  <td className="px-3 py-2">{row.sectionName || "-"}</td>
                                  <td className="px-3 py-2">{row.locationCode || "-"}</td>
                                  <td className="px-3 py-2">{row.stockCount} {row.stockUnit}</td>
                                  <td className="px-3 py-2">{row.cutTotal}</td>
                                  <td className="px-3 py-2 font-semibold">{row.runningBalance} {row.stockUnit}</td>
                                  <td className="px-3 py-2">{row.importNumber ? `IMP-${row.importNumber.padStart(4, "0")}` : "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                    </CollapsibleTableSection>
                  )
                })
              )}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeInventoryRow ? (
        <ModalShell title={`Inventory Row ${activeInventoryRow.itemNumber}`} onClose={closeInventoryRow}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Item #</p>
                <p className="mt-1 font-medium">{activeInventoryRow.itemNumber}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Dye Lot</p>
                <p className="mt-1 font-medium">{activeInventoryRow.dyeLot || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Warehouse</p>
                <p className="mt-1 font-medium">{activeInventoryRow.warehouseName || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Section</p>
                <p className="mt-1 font-medium">{activeInventoryRow.sectionName || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Location</p>
                <p className="mt-1 font-medium">{activeInventoryRow.locationCode || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Product</p>
                <p className="mt-1 font-medium">{activeInventoryRow.productName}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Starting Stock</p>
                <p className="mt-1 font-medium">{activeInventoryRow.stockCount} {activeInventoryRow.stockUnit}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Cuts Total</p>
                <p className="mt-1 font-medium">{activeInventoryRow.cutTotal}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Running Balance</p>
                <p className="mt-1 font-medium text-blue-500">{activeInventoryRow.runningBalance} {activeInventoryRow.stockUnit}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Cut Logs</h3>
                <p className="text-sm text-[var(--foreground)]/70">Enter the cut quantity to reduce stock. It cannot exceed the remaining running balance.</p>
              </div>

              <div className="rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                <div className="grid gap-4 md:grid-cols-[220px,minmax(0,1fr),auto] md:items-end">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[var(--foreground)]/80">Cut Quantity</span>
                    <input
                      value={cutLogDraft.quantityTaken}
                      onChange={(event) => setCutLogDraft((prev) => ({ ...prev, quantityTaken: event.target.value }))}
                      placeholder="Enter cut amount"
                      className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[var(--foreground)]/80">Notes</span>
                    <input
                      value={cutLogDraft.notes}
                      onChange={(event) => setCutLogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                      className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2"
                    />
                  </label>
                  <div className="flex items-center justify-end gap-3">
                    {cutLogError ? <p className="text-right text-sm text-rose-600">{cutLogError}</p> : null}
                    {!cutLogError && cutLogMessage ? <p className="text-right text-sm text-emerald-600">{cutLogMessage}</p> : null}
                    <button
                      type="button"
                      onClick={() => void addCutLog()}
                      disabled={isSavingCutLog || !canSubmitAdjustment}
                      className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 md:w-auto"
                    >
                      {isSavingCutLog ? "Saving..." : canSubmitAdjustment ? "Add Cut" : "Balance at 0"}
                    </button>
                  </div>
                </div>
              </div>

              {!canAddPositiveCut ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                  Running balance is 0. No additional cuts can be added for this inventory row.
                </p>
              ) : null}

            <ModalTableShell minWidthClass="min-w-[760px]">
              <ModalTableHead>
                  <tr>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell>Before</TableHeaderCell>
                    <TableHeaderCell>Cut</TableHeaderCell>
                    <TableHeaderCell>After</TableHeaderCell>
                    <TableHeaderCell>Notes</TableHeaderCell>
                  </tr>
              </ModalTableHead>
                <tbody>
                    {activeInventoryRow.cutLogs.map((log) => (
                      <tr key={log.id} className="border-t border-[var(--panel-border)]">
                        <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2">{log.before}</td>
                        <td className="px-3 py-2">{log.cut}</td>
                        <td className="px-3 py-2">{log.after}</td>
                        <td className="px-3 py-2">{log.notes || "-"}</td>
                      </tr>
                    ))}
                    {activeInventoryRow.cutLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                          No cut logs yet for this inventory row.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
            </ModalTableShell>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
